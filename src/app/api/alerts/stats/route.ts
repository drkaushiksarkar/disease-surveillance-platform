import { NextResponse } from 'next/server';
import { Pool } from 'pg';

export const dynamic = 'force-dynamic';

const pool = new Pool({
  host: '119.148.17.102',
  port: 5432,
  user: 'ewars',
  password: 'Iedcr@Ewars2025',
  database: 'ewarsdb',
});

interface AlertStats {
  currentPeriodCases: number;
  previousPeriodCases: number;
  percentChange: number;
  districtsOnAlert: number;
  totalDistricts: number;
  nationalRiskLevel: 'Low' | 'Medium' | 'High';
  latestDataDate: string;
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

async function getMalariaStats(type: 'pf' | 'pv', method: string): Promise<AlertStats> {
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
    const latestDataDate = `${latestYear}-${String(latestMonth).padStart(2, '0')}`;

    // Calculate 12 months back
    let oneYearBackYear = latestYear;
    let oneYearBackMonth = latestMonth - 11;
    if (oneYearBackMonth <= 0) {
      oneYearBackYear -= 1;
      oneYearBackMonth += 12;
    }

    // Get current period (last month) data by district
    const currentQuery = `
      SELECT dis_name as district, SUM(${caseColumn}) as cases
      FROM malaria_weather
      WHERE year = $1 AND month = $2 AND ${caseColumn} IS NOT NULL
      GROUP BY dis_name
    `;
    const currentResult = await client.query(currentQuery, [latestYear, latestMonth]);

    // Get previous period (month before last) data by district
    let prevYear = latestYear;
    let prevMonth = latestMonth - 1;
    if (prevMonth <= 0) {
      prevYear -= 1;
      prevMonth += 12;
    }

    const previousQuery = `
      SELECT dis_name as district, SUM(${caseColumn}) as cases
      FROM malaria_weather
      WHERE year = $1 AND month = $2 AND ${caseColumn} IS NOT NULL
      GROUP BY dis_name
    `;
    const previousResult = await client.query(previousQuery, [prevYear, prevMonth]);

    // Get all historical data for threshold calculation (before the last 12 months)
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

    // Calculate stats
    const currentPeriodCases = currentResult.rows.reduce((sum, row) => sum + (parseFloat(row.cases) || 0), 0);
    const previousPeriodCases = previousResult.rows.reduce((sum, row) => sum + (parseFloat(row.cases) || 0), 0);
    const percentChange = previousPeriodCases > 0
      ? ((currentPeriodCases - previousPeriodCases) / previousPeriodCases) * 100
      : 0;

    // Count districts on alert
    let districtsOnAlert = 0;
    currentResult.rows.forEach(row => {
      const threshold = thresholdMap.get(row.district) || 0;
      if (parseFloat(row.cases) > threshold) {
        districtsOnAlert++;
      }
    });

    const totalDistricts = currentResult.rows.length;
    const alertPercentage = totalDistricts > 0 ? (districtsOnAlert / totalDistricts) * 100 : 0;
    const nationalRiskLevel: 'Low' | 'Medium' | 'High' =
      alertPercentage > 50 ? 'High' : alertPercentage > 25 ? 'Medium' : 'Low';

    return {
      currentPeriodCases: Math.round(currentPeriodCases),
      previousPeriodCases: Math.round(previousPeriodCases),
      percentChange: Math.round(percentChange * 10) / 10,
      districtsOnAlert,
      totalDistricts,
      nationalRiskLevel,
      latestDataDate,
    };
  } finally {
    client.release();
  }
}

async function getDengueStats(method: string): Promise<AlertStats> {
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
    const latestDataDate = `${latestYear}-W${String(latestWeek).padStart(2, '0')}`;

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

    // Get previous week data by district
    let prevYear = latestYear;
    let prevWeek = latestWeek - 1;
    if (prevWeek <= 0) {
      prevYear -= 1;
      prevWeek += 52;
    }

    const previousQuery = `
      SELECT district, SUM(weekly_hospitalised_cases) as cases
      FROM dengue_weather
      WHERE year = $1 AND epi_week = $2 AND weekly_hospitalised_cases IS NOT NULL
      GROUP BY district
    `;
    const previousResult = await client.query(previousQuery, [prevYear, prevWeek]);

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

    // Calculate stats
    const currentPeriodCases = currentResult.rows.reduce((sum, row) => sum + (parseFloat(row.cases) || 0), 0);
    const previousPeriodCases = previousResult.rows.reduce((sum, row) => sum + (parseFloat(row.cases) || 0), 0);
    const percentChange = previousPeriodCases > 0
      ? ((currentPeriodCases - previousPeriodCases) / previousPeriodCases) * 100
      : 0;

    // Count districts on alert
    let districtsOnAlert = 0;
    currentResult.rows.forEach(row => {
      const threshold = thresholdMap.get(row.district) || 0;
      if (parseFloat(row.cases) > threshold) {
        districtsOnAlert++;
      }
    });

    const totalDistricts = currentResult.rows.length;
    const alertPercentage = totalDistricts > 0 ? (districtsOnAlert / totalDistricts) * 100 : 0;
    const nationalRiskLevel: 'Low' | 'Medium' | 'High' =
      alertPercentage > 50 ? 'High' : alertPercentage > 25 ? 'Medium' : 'Low';

    return {
      currentPeriodCases: Math.round(currentPeriodCases),
      previousPeriodCases: Math.round(previousPeriodCases),
      percentChange: Math.round(percentChange * 10) / 10,
      districtsOnAlert,
      totalDistricts,
      nationalRiskLevel,
      latestDataDate,
    };
  } finally {
    client.release();
  }
}

async function getDiarrhoeaStats(method: string): Promise<AlertStats> {
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
    const latestDataDate = latestDate;

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

    // Get previous week data (7 days before current week) by district
    const previousWeekEnd = new Date(currentWeekStart);
    previousWeekEnd.setDate(previousWeekEnd.getDate() - 1);
    const previousWeekStart = new Date(previousWeekEnd);
    previousWeekStart.setDate(previousWeekStart.getDate() - 6);

    const previousQuery = `
      SELECT district, SUM(daily_cases) as cases
      FROM awd_weather
      WHERE date >= $1 AND date <= $2 AND daily_cases IS NOT NULL
      GROUP BY district
    `;
    const previousResult = await client.query(previousQuery, [previousWeekStart, previousWeekEnd]);

    // Get historical data for threshold calculation (before the last 365 days)
    // We'll aggregate by week for comparison
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

    // Calculate stats
    const currentPeriodCases = currentResult.rows.reduce((sum, row) => sum + (parseFloat(row.cases) || 0), 0);
    const previousPeriodCases = previousResult.rows.reduce((sum, row) => sum + (parseFloat(row.cases) || 0), 0);
    const percentChange = previousPeriodCases > 0
      ? ((currentPeriodCases - previousPeriodCases) / previousPeriodCases) * 100
      : 0;

    // Count districts on alert
    let districtsOnAlert = 0;
    currentResult.rows.forEach(row => {
      const threshold = thresholdMap.get(row.district) || 0;
      if (parseFloat(row.cases) > threshold) {
        districtsOnAlert++;
      }
    });

    const totalDistricts = currentResult.rows.length;
    const alertPercentage = totalDistricts > 0 ? (districtsOnAlert / totalDistricts) * 100 : 0;
    const nationalRiskLevel: 'Low' | 'Medium' | 'High' =
      alertPercentage > 50 ? 'High' : alertPercentage > 25 ? 'Medium' : 'Low';

    return {
      currentPeriodCases: Math.round(currentPeriodCases),
      previousPeriodCases: Math.round(previousPeriodCases),
      percentChange: Math.round(percentChange * 10) / 10,
      districtsOnAlert,
      totalDistricts,
      nationalRiskLevel,
      latestDataDate,
    };
  } finally {
    client.release();
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const disease = searchParams.get('disease') || 'dengue';
    const method = searchParams.get('method') || 'p95';

    let stats: AlertStats;

    if (disease === 'malaria_pf') {
      stats = await getMalariaStats('pf', method);
    } else if (disease === 'malaria_pv') {
      stats = await getMalariaStats('pv', method);
    } else if (disease === 'dengue') {
      stats = await getDengueStats(method);
    } else if (disease === 'diarrhoea') {
      stats = await getDiarrhoeaStats(method);
    } else {
      return NextResponse.json(
        { error: 'Invalid disease parameter' },
        { status: 400 }
      );
    }

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error fetching alert stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch alert statistics' },
      { status: 500 }
    );
  }
}
