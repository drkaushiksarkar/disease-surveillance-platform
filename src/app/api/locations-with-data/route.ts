import { NextResponse } from 'next/server';
import { Pool } from 'pg';

// Create a connection pool
const pool = new Pool({
  host: process.env.PG_HOST_2,
  port: parseInt(process.env.PG_PORT_2 || '5432'),
  database: process.env.PG_DB_2,
  user: process.env.PG_USER_2,
  password: process.env.PG_PASS_2,
});

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Query all districts that have data across all three disease tables
    const query = `
      SELECT DISTINCT LOWER(district_name) as district_name_lower
      FROM (
        SELECT DISTINCT dis_name as district_name FROM malaria_weather WHERE pf IS NOT NULL OR pv IS NOT NULL
        UNION
        SELECT DISTINCT district as district_name FROM dengue_weather WHERE weekly_hospitalised_cases IS NOT NULL
        UNION
        SELECT DISTINCT district as district_name FROM awd_weather WHERE daily_cases IS NOT NULL
      ) AS all_districts
      ORDER BY district_name_lower
    `;

    const result = await pool.query(query);

    // Extract district names, normalize them, and handle variations
    const nameVariations: { [key: string]: string } = {
      'chattagram': 'Chattogram',
      'natrakona': 'Netrakona',
      'maulvibazar': 'Moulvibazar',
    };

    const districtsSet = new Set<string>();

    result.rows.forEach((row: any) => {
      const nameLower = row.district_name_lower;

      // Check if there's a known variation
      let normalizedName = nameVariations[nameLower];

      if (!normalizedName) {
        // Default normalization: capitalize first letter of each word
        normalizedName = nameLower
          .split(' ')
          .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
      }

      districtsSet.add(normalizedName);
    });

    const districtsWithData = Array.from(districtsSet).sort();

    console.log(`Locations API: Found ${districtsWithData.length} districts with data`);

    return NextResponse.json({
      districts: districtsWithData
    });
  } catch (error) {
    console.error('Error fetching locations with data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch locations with data', details: (error as Error).message },
      { status: 500 }
    );
  }
}
