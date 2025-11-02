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

interface DistrictAlertData {
  district: string;
  cases: number;
  baseline: number;
  isOnAlert: boolean;
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

async function getMalariaDistrictData(type: 'pf' | 'pv', method: string): Promise<DistrictAlertData[]> {
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

    // Calculate 12 months back
    let oneYearBackYear = latestYear;
    let oneYearBackMonth = latestMonth - 11;
    if (oneYearBackMonth <= 0) {
      oneYearBackYear -= 1;
      oneYearBackMonth += 12;
    }

    // Get current month data by district
    const currentQuery = `
      SELECT dis_name as district, SUM(${caseColumn}) as cases
      FROM malaria_weather
      WHERE year = $1 AND month = $2 AND ${caseColumn} IS NOT NULL
      GROUP BY dis_name
    `;
    const currentResult = await client.query(currentQuery, [latestYear, latestMonth]);

    // Get historical data for threshold calculation (before the last 12 months)
    const historicalQuery = `
      SELECT dis_name as district, year, month, SUM(${caseColumn}) as cases
      FROM malaria_weather
      WHERE ${caseColumn} IS NOT NULL
        AND (
          (year < $1) OR
          (year = $1 AND month < $2)
        )
      GROUP BY dis_name, year, month
      ORDER BY dis_name, year, month
    `;
    const historicalResult = await client.query(historicalQuery, [oneYearBackYear, oneYearBackMonth]);

    // Calculate thresholds per district
    const thresholdMap = new Map<string, number>();
    const districtHistoricalData = new Map<string, number[]>();

    historicalResult.rows.forEach(row => {
      if (!districtHistoricalData.has(row.district)) {
        districtHistoricalData.set(row.district, []);
      }
      districtHistoricalData.get(row.district)!.push(parseFloat(row.cases) || 0);
    });

    districtHistoricalData.forEach((values, district) => {
      const threshold = calculateBaseline(values, method);
      thresholdMap.set(district, threshold);
    });

    // Build result
    const result: DistrictAlertData[] = currentResult.rows.map(row => {
      const cases = parseFloat(row.cases) || 0;
      const baseline = thresholdMap.get(row.district) || 0;

      return {
        district: row.district,
        cases: Math.round(cases),
        baseline: Math.round(baseline),
        isOnAlert: cases > baseline,
      };
    });

    return result;
  } finally {
    client.release();
  }
}

async function getDengueDistrictData(method: string): Promise<DistrictAlertData[]> {
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

    // Get current week data by district
    const currentQuery = `
      SELECT district, SUM(weekly_hospitalised_cases) as cases
      FROM dengue_weather
      WHERE year = $1 AND epi_week = $2 AND weekly_hospitalised_cases IS NOT NULL
      GROUP BY district
    `;
    const currentResult = await client.query(currentQuery, [latestYear, latestWeek]);

    // Get historical data for threshold calculation (before the last 52 weeks)
    const historicalQuery = `
      SELECT district, year, epi_week, SUM(weekly_hospitalised_cases) as cases
      FROM dengue_weather
      WHERE weekly_hospitalised_cases IS NOT NULL
        AND (
          (year < $1) OR
          (year = $1 AND epi_week < $2)
        )
      GROUP BY district, year, epi_week
      ORDER BY district, year, epi_week
    `;
    const historicalResult = await client.query(historicalQuery, [oneYearBackYear, oneYearBackWeek]);

    // Calculate thresholds per district
    const thresholdMap = new Map<string, number>();
    const districtHistoricalData = new Map<string, number[]>();

    historicalResult.rows.forEach(row => {
      if (!districtHistoricalData.has(row.district)) {
        districtHistoricalData.set(row.district, []);
      }
      districtHistoricalData.get(row.district)!.push(parseFloat(row.cases) || 0);
    });

    districtHistoricalData.forEach((values, district) => {
      const threshold = calculateBaseline(values, method);
      thresholdMap.set(district, threshold);
    });

    // Build result
    const result: DistrictAlertData[] = currentResult.rows.map(row => {
      const cases = parseFloat(row.cases) || 0;
      const baseline = thresholdMap.get(row.district) || 0;

      return {
        district: row.district,
        cases: Math.round(cases),
        baseline: Math.round(baseline),
        isOnAlert: cases > baseline,
      };
    });

    return result;
  } finally {
    client.release();
  }
}

async function getDiarrhoeaDistrictData(method: string): Promise<DistrictAlertData[]> {
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

    // Get current week data (last 7 days) by district
    const currentWeekStart = new Date(latestDate);
    currentWeekStart.setDate(currentWeekStart.getDate() - 6);

    const currentQuery = `
      SELECT district, SUM(daily_cases) as cases
      FROM awd_weather
      WHERE date >= $1 AND date <= $2 AND daily_cases IS NOT NULL
      GROUP BY district
    `;
    const currentResult = await client.query(currentQuery, [currentWeekStart, latestDate]);

    // Get historical data for threshold calculation (before the last 365 days)
    // Aggregate by week
    const historicalQuery = `
      SELECT
        district,
        DATE_TRUNC('week', date) as week_start,
        SUM(daily_cases) as cases
      FROM awd_weather
      WHERE daily_cases IS NOT NULL
        AND date < $1
      GROUP BY district, DATE_TRUNC('week', date)
      ORDER BY district, week_start
    `;
    const historicalResult = await client.query(historicalQuery, [oneYearBack]);

    // Calculate thresholds per district
    const thresholdMap = new Map<string, number>();
    const districtHistoricalData = new Map<string, number[]>();

    historicalResult.rows.forEach(row => {
      if (!districtHistoricalData.has(row.district)) {
        districtHistoricalData.set(row.district, []);
      }
      districtHistoricalData.get(row.district)!.push(parseFloat(row.cases) || 0);
    });

    districtHistoricalData.forEach((values, district) => {
      const threshold = calculateBaseline(values, method);
      thresholdMap.set(district, threshold);
    });

    // Build result
    const result: DistrictAlertData[] = currentResult.rows.map(row => {
      const cases = parseFloat(row.cases) || 0;
      const baseline = thresholdMap.get(row.district) || 0;

      return {
        district: row.district,
        cases: Math.round(cases),
        baseline: Math.round(baseline),
        isOnAlert: cases > baseline,
      };
    });

    return result;
  } finally {
    client.release();
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const disease = searchParams.get('disease') || 'dengue';
    const method = searchParams.get('method') || 'p95';

    let data: DistrictAlertData[];

    if (disease === 'malaria_pf') {
      data = await getMalariaDistrictData('pf', method);
    } else if (disease === 'malaria_pv') {
      data = await getMalariaDistrictData('pv', method);
    } else if (disease === 'dengue') {
      data = await getDengueDistrictData(method);
    } else if (disease === 'diarrhoea') {
      data = await getDiarrhoeaDistrictData(method);
    } else {
      return NextResponse.json(
        { error: 'Invalid disease parameter' },
        { status: 400 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching district alert data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch district alert data' },
      { status: 500 }
    );
  }
}
