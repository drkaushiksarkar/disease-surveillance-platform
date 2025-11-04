import { NextResponse } from 'next/server';
import { query, table } from '@/lib/db';
import { Pool } from 'pg';

// Create a connection pool for weather data using the _2 credentials
const weatherPool = new Pool({
  host: process.env.PG_HOST_2,
  port: parseInt(process.env.PG_PORT_2 || '5432'),
  database: process.env.PG_DB_2,
  user: process.env.PG_USER_2,
  password: process.env.PG_PASS_2,
});

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const disease = searchParams.get('disease') || 'dengue';
    const district = searchParams.get('district');
    let dateFrom = searchParams.get('from');
    let dateTo = searchParams.get('to');

    if (!district) {
      return NextResponse.json(
        { error: 'District parameter is required' },
        { status: 400 }
      );
    }

    // Default to last one year if no date range specified
    if (!dateFrom && !dateTo) {
      const today = new Date();
      const oneYearAgo = new Date(today);
      oneYearAgo.setFullYear(today.getFullYear() - 1);
      dateFrom = oneYearAgo.toISOString().split('T')[0];
      dateTo = today.toISOString().split('T')[0];
    }

    console.log(`Fetching prediction chart data for disease: ${disease}, district: ${district}, dateFrom: ${dateFrom}, dateTo: ${dateTo}`);

    // Map disease to table names
    const weatherTableMap: { [key: string]: string } = {
      dengue: 'dengue_weather',
      diarrhoea: 'awd_weather',
      malaria_pf: 'malaria_weather',
      malaria_pv: 'malaria_weather',
    };

    const predictionsTableMap: { [key: string]: string } = {
      dengue: 'dengue_predictions',
      diarrhoea: 'diarrhoea_predictions',
      malaria_pf: 'malaria_pf_predictions',
      malaria_pv: 'malaria_pv_predictions',
    };

    const weatherTable = weatherTableMap[disease];
    const predictionsTable = predictionsTableMap[disease];

    if (!weatherTable || !predictionsTable) {
      return NextResponse.json(
        { error: `Invalid disease: ${disease}` },
        { status: 400 }
      );
    }

    let historicalData: any[] = [];
    let predictionData: any = null;

    // Fetch historical data from weather tables using weatherPool
    try {
      if (disease === 'malaria_pf' || disease === 'malaria_pv') {
        // For malaria, show disease-specific historical data (PF or PV only)
        const diseaseColumn = disease === 'malaria_pf' ? 'pf' : 'pv';
        console.log(`Querying malaria_weather for district: ${district}, showing ${disease} historical data`);
        const result = await weatherPool.query(
          `SELECT
            year,
            month,
            SUM(COALESCE(${diseaseColumn}, 0)) as cases
           FROM malaria_weather
           WHERE LOWER(dis_name) = LOWER($1)
             AND year IS NOT NULL
             AND month IS NOT NULL
           GROUP BY year, month
           ORDER BY year, month`,
          [district]
        );
        console.log(`Fetched ${result.rows.length} rows of ${disease} historical data`);

        // Transform to date format
        historicalData = result.rows.map((row: any) => ({
          report_date: `${row.year}-${String(row.month).padStart(2, '0')}-01`,
          cases: parseFloat(row.cases) || 0
        }));
      } else if (disease === 'dengue') {
        // Dengue data comes from dengue_weather table in database
        console.log(`Querying dengue_weather for district: ${district}`);
        const result = await weatherPool.query(
          `SELECT
            year,
            epi_week,
            SUM(COALESCE(weekly_hospitalised_cases, 0)) as cases
           FROM dengue_weather
           WHERE LOWER(district) = LOWER($1)
             AND year IS NOT NULL
             AND epi_week IS NOT NULL
           GROUP BY year, epi_week
           ORDER BY year, epi_week`,
          [district]
        );
        console.log(`Fetched ${result.rows.length} rows of dengue historical data`);

        // Transform to date format - approximate date from year and epi_week
        historicalData = result.rows.map((row: any) => {
          // Approximate date: year start + (epi_week * 7) days
          const date = new Date(row.year, 0, 1 + (row.epi_week * 7));
          return {
            report_date: date.toISOString().split('T')[0],
            cases: parseFloat(row.cases) || 0
          };
        });
      } else if (disease === 'diarrhoea') {
        // Diarrhoea (AWD) data comes from awd_weather table in database
        console.log(`Querying awd_weather for district: ${district}`);
        const result = await weatherPool.query(
          `SELECT
            date as report_date,
            SUM(COALESCE(daily_cases, 0)) as cases
           FROM awd_weather
           WHERE LOWER(district) = LOWER($1)
             AND date IS NOT NULL
           GROUP BY date
           ORDER BY date`,
          [district]
        );
        console.log(`Fetched ${result.rows.length} rows of diarrhoea historical data`);

        // Transform to standard format
        historicalData = result.rows.map((row: any) => ({
          report_date: row.report_date instanceof Date
            ? row.report_date.toISOString().split('T')[0]
            : row.report_date,
          cases: parseFloat(row.cases) || 0
        }));
      }
    } catch (error) {
      console.error(`Error fetching historical data from ${weatherTable}:`, error);
      console.error(`Error details:`, (error as Error).message);
      // Continue even if historical data fails - we might still have predictions
    }

    // Filter historical data by date range
    if (dateFrom || dateTo) {
      historicalData = historicalData.filter((row: any) => {
        const rowDate = row.report_date;
        if (!rowDate) return false;

        if (dateFrom && rowDate < dateFrom) return false;
        if (dateTo && rowDate > dateTo) return false;

        return true;
      });
      console.log(`Filtered to ${historicalData.length} data points within date range`);
    }

    // Fetch the latest prediction
    try {
      if (disease === 'malaria_pf' || disease === 'malaria_pv') {
        // For malaria, use the specific predictions table
        console.log(`Querying ${predictionsTable} for district: ${district}`);
        try {
          const result = await query<{
            year: number;
            month: number;
            predicted_cases: number;
            uncertainty_low: number;
            uncertainty_high: number;
          }>(
            `SELECT
              year,
              month,
              predicted_cases,
              uncertainty_low,
              uncertainty_high
             FROM ${table(predictionsTable)}
             WHERE LOWER(district) = LOWER($1)
               AND year IS NOT NULL
               AND month IS NOT NULL
               AND predicted_cases IS NOT NULL
             ORDER BY year DESC, month DESC
             LIMIT 1`,
            [district]
          );

          if (result.rows.length > 0) {
            const row = result.rows[0];
            predictionData = {
              report_date: `${row.year}-${String(row.month).padStart(2, '0')}-01`,
              predicted: row.predicted_cases,
              uncertainity_low: row.uncertainty_low || row.predicted_cases * 0.8,
              uncertainity_high: row.uncertainty_high || row.predicted_cases * 1.2,
            };
            console.log(`Found ${disease} prediction for ${district}:`, predictionData);
          } else {
            console.log(`No prediction data found in ${predictionsTable} for ${district}`);
          }
        } catch (innerError) {
          console.error(`${disease} predictions query failed:`, (innerError as Error).message);
        }
      } else {
        // Dengue and diarrhoea predictions from their respective predictions tables
        console.log(`Querying ${predictionsTable} for district: ${district}`);
        try {
          const result = await query<{
            report_date: Date | string;
            predicted_cases: number | string;
            uncertainty_low: number | string | null;
            uncertainty_high: number | string | null;
          }>(
            `SELECT
              report_date,
              predicted_cases,
              uncertainty_low,
              uncertainty_high
             FROM ${table(predictionsTable)}
             WHERE LOWER(district) = LOWER($1)
               AND report_date IS NOT NULL
               AND predicted_cases IS NOT NULL
             ORDER BY report_date DESC
             LIMIT 1`,
            [district]
          );

          if (result.rows.length > 0) {
            const row = result.rows[0];
            const reportDate = row.report_date instanceof Date
              ? row.report_date.toISOString().split('T')[0]
              : String(row.report_date).split('T')[0];

            const predictedCases = typeof row.predicted_cases === 'number'
              ? row.predicted_cases
              : parseFloat(String(row.predicted_cases));

            const uncertaintyLow = row.uncertainty_low
              ? (typeof row.uncertainty_low === 'number' ? row.uncertainty_low : parseFloat(String(row.uncertainty_low)))
              : predictedCases * 0.8;

            const uncertaintyHigh = row.uncertainty_high
              ? (typeof row.uncertainty_high === 'number' ? row.uncertainty_high : parseFloat(String(row.uncertainty_high)))
              : predictedCases * 1.2;

            predictionData = {
              report_date: reportDate,
              predicted: predictedCases,
              uncertainity_low: uncertaintyLow,
              uncertainity_high: uncertaintyHigh,
            };
            console.log(`Found ${disease} prediction for ${district}:`, predictionData);
          } else {
            console.log(`No prediction data found in ${predictionsTable} for ${district}`);
          }
        } catch (innerError) {
          console.error(`${disease} predictions query failed:`, (innerError as Error).message);
        }
      }

      console.log(`Prediction data for ${disease} in ${district}:`, predictionData);
    } catch (error) {
      console.error(`Error fetching prediction data from ${predictionsTable}:`, error);
      console.error(`Error details:`, (error as Error).message);
      // Continue even if predictions fail - we might still have historical data
    }

    // Transform data for the chart
    const chartData: Array<{
      date: any;
      cases: any;
      type: string;
      uncertainity_low?: number;
      uncertainity_high?: number;
    }> = historicalData.map((row: any) => ({
      date: row.report_date,
      cases: row.cases,
      type: 'historical',
    }));

    // Add prediction as the last point if available
    if (predictionData) {
      chartData.push({
        date: predictionData.report_date,
        cases: predictionData.predicted,
        type: 'predicted',
        uncertainity_low: predictionData.uncertainity_low,
        uncertainity_high: predictionData.uncertainity_high,
      });
    }

    const response = {
      historical: chartData.filter((d: any) => d.type === 'historical'),
      prediction: predictionData ? {
        date: predictionData.report_date,
        predicted: predictionData.predicted,
        uncertainity_low: predictionData.uncertainity_low,
        uncertainity_high: predictionData.uncertainity_high,
      } : null,
    };

    console.log(`Returning data for ${disease} in ${district}:`, {
      historicalPoints: response.historical.length,
      hasPrediction: !!response.prediction,
    });

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching prediction chart data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch prediction chart data', details: (error as Error).message },
      { status: 500 }
    );
  }
}
