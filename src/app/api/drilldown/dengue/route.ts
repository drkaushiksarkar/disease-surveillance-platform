import { NextResponse } from 'next/server';
import { Pool } from 'pg';

// Create a connection pool for database access
const pool = new Pool({
  host: process.env.PG_HOST,
  port: parseInt(process.env.PG_PORT || '5432'),
  database: process.env.PG_DB,
  user: process.env.PG_USER,
  password: process.env.PG_PASS,
});

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    console.log('Fetching dengue data from dengue_weather table');

    const result = await pool.query(`
      SELECT
        district,
        division,
        year,
        epi_week,
        weekly_hospitalised_cases,
        total_rainfall,
        avg_humidity,
        avg_temperature
      FROM dengue_weather
      WHERE year IS NOT NULL
        AND epi_week IS NOT NULL
      ORDER BY year, epi_week, district
    `);

    console.log(`Fetched ${result.rows.length} rows of dengue data`);
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Error fetching dengue data from database:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dengue data', details: (error as Error).message },
      { status: 500 }
    );
  }
}
