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
    console.log('Fetching AWD (diarrhoea) data from awd_weather table');

    const result = await pool.query(`
      SELECT
        district,
        division,
        date,
        daily_cases,
        temperature,
        humidity,
        rainfall
      FROM awd_weather
      WHERE date IS NOT NULL
      ORDER BY date, district
    `);

    console.log(`Fetched ${result.rows.length} rows of AWD data`);
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Error fetching AWD data from database:', error);
    return NextResponse.json(
      { error: 'Failed to fetch AWD data', details: (error as Error).message },
      { status: 500 }
    );
  }
}
