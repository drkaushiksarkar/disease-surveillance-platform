import { NextResponse } from 'next/server';
import { Pool } from 'pg';

export const dynamic = 'force-dynamic';

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

interface NationalDataPoint {
  period: string;
  cases: number;
  baseline: number;
  isAlert: boolean;
}

// Calculate baseline using different methods
function calculateBaseline(values: number[], method: string): number {
  if (values.length === 0) return 0;

  const sorted = [...values].sort((a, b) => a - b);

  switch (method) {
    case 'p95':
      const p95Index = Math.floor(sorted.length * 0.95);
      return sorted[p95Index] || 0;

    case 'mean2sd':
      const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
      const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
      const sd = Math.sqrt(variance);
      return mean + 2 * sd;

    case 'endemic':
      const median = sorted[Math.floor(sorted.length / 2)] || 0;
      const q1 = sorted[Math.floor(sorted.length * 0.25)] || 0;
      const q3 = sorted[Math.floor(sorted.length * 0.75)] || 0;
      const iqr = q3 - q1;
      return median + 2 * iqr;

    default:
      return 0;
  }
}

async function getMalariaNationalData(type: 'pf' | 'pv', method: string): Promise<NationalDataPoint[]> {
  const client = await pool.connect();
  try {
    const caseColumn = type === 'pf' ? 'pf' : 'pv';

    // Get latest data date
    const latestDateQuery = `
      SELECT year, month
      FROM malaria_weather
      WHERE ${caseColumn} IS NOT NULL
      ORDER BY year DESC, month DESC
      LIMIT 1
    `;
    const latestDateResult = await client.query(latestDateQuery);
    const latestYear = latestDateResult.rows[0]?.year;
    const latestMonth = latestDateResult.rows[0]?.month;

    // Calculate 12 months back from latest
    let oneYearBackYear = latestYear;
    let oneYearBackMonth = latestMonth - 11;
    if (oneYearBackMonth <= 0) {
      oneYearBackYear -= 1;
      oneYearBackMonth += 12;
    }

    // Get last 12 months data
    const recentQuery = `
      SELECT year, month, SUM(${caseColumn}) as cases
      FROM malaria_weather
      WHERE ${caseColumn} IS NOT NULL
        AND (
          (year > $1) OR
          (year = $1 AND month >= $2)
        )
      GROUP BY year, month
      ORDER BY year, month
    `;
    const recentResult = await client.query(recentQuery, [oneYearBackYear, oneYearBackMonth]);

    // Get historical data for baseline (before last 12 months)
    const historicalQuery = `
      SELECT year, month, SUM(${caseColumn}) as cases
      FROM malaria_weather
      WHERE ${caseColumn} IS NOT NULL
        AND (
          (year < $1) OR
          (year = $1 AND month < $2)
        )
      GROUP BY year, month
      ORDER BY year, month
    `;
    const historicalResult = await client.query(historicalQuery, [oneYearBackYear, oneYearBackMonth]);

    // Group historical data by month for seasonal baselines
    const monthlyHistoricalData = new Map<number, number[]>();
    historicalResult.rows.forEach(row => {
      const month = row.month;
      if (!monthlyHistoricalData.has(month)) {
        monthlyHistoricalData.set(month, []);
      }
      monthlyHistoricalData.get(month)!.push(parseFloat(row.cases) || 0);
    });

    // Calculate baseline for each month in recent data
    const nationalData: NationalDataPoint[] = recentResult.rows.map(row => {
      const month = row.month;
      const cases = parseFloat(row.cases) || 0;
      const historicalValues = monthlyHistoricalData.get(month) || [];
      const baseline = calculateBaseline(historicalValues, method);

      return {
        period: `${row.year}-${String(row.month).padStart(2, '0')}`,
        cases: Math.round(cases),
        baseline: Math.round(baseline),
        isAlert: cases > baseline,
      };
    });

    return nationalData;
  } finally {
    client.release();
  }
}

async function getDengueNationalData(method: string): Promise<NationalDataPoint[]> {
  const client = await pool.connect();
  try {
    // Get latest data date
    const latestDateQuery = `
      SELECT year, epi_week
      FROM dengue_weather
      WHERE weekly_hospitalised_cases IS NOT NULL
      ORDER BY year DESC, epi_week DESC
      LIMIT 1
    `;
    const latestDateResult = await client.query(latestDateQuery);
    const latestYear = latestDateResult.rows[0]?.year;
    const latestWeek = latestDateResult.rows[0]?.epi_week;

    // Calculate 52 weeks back
    let oneYearBackYear = latestYear;
    let oneYearBackWeek = latestWeek - 51;
    if (oneYearBackWeek <= 0) {
      oneYearBackYear -= 1;
      oneYearBackWeek += 52;
    }

    // Get last 52 weeks data
    const recentQuery = `
      SELECT year, epi_week, SUM(weekly_hospitalised_cases) as cases
      FROM dengue_weather
      WHERE weekly_hospitalised_cases IS NOT NULL
        AND (
          (year > $1) OR
          (year = $1 AND epi_week >= $2)
        )
      GROUP BY year, epi_week
      ORDER BY year, epi_week
    `;
    const recentResult = await client.query(recentQuery, [oneYearBackYear, oneYearBackWeek]);

    // Get historical data for baseline (before last 52 weeks)
    const historicalQuery = `
      SELECT year, epi_week, SUM(weekly_hospitalised_cases) as cases
      FROM dengue_weather
      WHERE weekly_hospitalised_cases IS NOT NULL
        AND (
          (year < $1) OR
          (year = $1 AND epi_week < $2)
        )
      GROUP BY year, epi_week
      ORDER BY year, epi_week
    `;
    const historicalResult = await client.query(historicalQuery, [oneYearBackYear, oneYearBackWeek]);

    // Group historical data by week for seasonal baselines
    const weeklyHistoricalData = new Map<number, number[]>();
    historicalResult.rows.forEach(row => {
      const week = row.epi_week;
      if (!weeklyHistoricalData.has(week)) {
        weeklyHistoricalData.set(week, []);
      }
      weeklyHistoricalData.get(week)!.push(parseFloat(row.cases) || 0);
    });

    // Calculate baseline for each week in recent data
    const nationalData: NationalDataPoint[] = recentResult.rows.map(row => {
      const week = row.epi_week;
      const cases = parseFloat(row.cases) || 0;
      const historicalValues = weeklyHistoricalData.get(week) || [];
      const baseline = calculateBaseline(historicalValues, method);

      return {
        period: `${row.year}-W${String(row.epi_week).padStart(2, '0')}`,
        cases: Math.round(cases),
        baseline: Math.round(baseline),
        isAlert: cases > baseline,
      };
    });

    return nationalData;
  } finally {
    client.release();
  }
}

async function getDiarrhoeaNationalData(method: string): Promise<NationalDataPoint[]> {
  const client = await pool.connect();
  try {
    // Get latest data date
    const latestDateQuery = `
      SELECT date
      FROM awd_weather
      WHERE daily_cases IS NOT NULL
      ORDER BY date DESC
      LIMIT 1
    `;
    const latestDateResult = await client.query(latestDateQuery);
    const latestDate = latestDateResult.rows[0]?.date;

    // Calculate 365 days back
    const oneYearBack = new Date(latestDate);
    oneYearBack.setDate(oneYearBack.getDate() - 364);

    // Get last 52 weeks data (aggregate daily to weekly)
    const recentQuery = `
      SELECT
        DATE_TRUNC('week', date) as week_start,
        EXTRACT(WEEK FROM DATE_TRUNC('week', date)) as week_num,
        SUM(daily_cases) as cases
      FROM awd_weather
      WHERE daily_cases IS NOT NULL
        AND date >= $1
      GROUP BY DATE_TRUNC('week', date)
      ORDER BY week_start
    `;
    const recentResult = await client.query(recentQuery, [oneYearBack]);

    // Get historical data for baseline (before last 365 days)
    // Group by week and aggregate
    const historicalQuery = `
      SELECT
        EXTRACT(WEEK FROM DATE_TRUNC('week', date)) as week_num,
        DATE_TRUNC('week', date) as week_start,
        SUM(daily_cases) as cases
      FROM awd_weather
      WHERE daily_cases IS NOT NULL
        AND date < $1
      GROUP BY DATE_TRUNC('week', date)
      ORDER BY week_start
    `;
    const historicalResult = await client.query(historicalQuery, [oneYearBack]);

    // Group historical data by week number for seasonal baselines
    const weeklyHistoricalData = new Map<number, number[]>();
    historicalResult.rows.forEach(row => {
      const weekNum = parseInt(row.week_num);
      if (!weeklyHistoricalData.has(weekNum)) {
        weeklyHistoricalData.set(weekNum, []);
      }
      weeklyHistoricalData.get(weekNum)!.push(parseFloat(row.cases) || 0);
    });

    // Calculate baseline for each week in recent data
    const nationalData: NationalDataPoint[] = recentResult.rows.map(row => {
      const weekStart = new Date(row.week_start);
      const weekNum = parseInt(row.week_num);
      const cases = parseFloat(row.cases) || 0;
      const historicalValues = weeklyHistoricalData.get(weekNum) || [];
      const baseline = calculateBaseline(historicalValues, method);

      return {
        period: weekStart.toISOString().split('T')[0],
        cases: Math.round(cases),
        baseline: Math.round(baseline),
        isAlert: cases > baseline,
      };
    });

    return nationalData;
  } finally {
    client.release();
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const disease = searchParams.get('disease') || 'dengue';
    const method = searchParams.get('method') || 'p95';

    let data: NationalDataPoint[];

    if (disease === 'malaria_pf') {
      data = await getMalariaNationalData('pf', method);
    } else if (disease === 'malaria_pv') {
      data = await getMalariaNationalData('pv', method);
    } else if (disease === 'dengue') {
      data = await getDengueNationalData(method);
    } else if (disease === 'diarrhoea') {
      data = await getDiarrhoeaNationalData(method);
    } else {
      return NextResponse.json(
        { error: 'Invalid disease parameter' },
        { status: 400 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching national data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch national data' },
      { status: 500 }
    );
  }
}
