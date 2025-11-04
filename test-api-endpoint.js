// Test script to verify API endpoint with database connection
require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.PG_HOST || process.env.DB_HOST,
  port: parseInt(process.env.PG_PORT || process.env.DB_PORT || '5432'),
  user: process.env.PG_USER || process.env.DB_USER,
  password: process.env.PG_PASS || process.env.DB_PASSWORD,
  database: process.env.PG_DB || process.env.DB_NAME,
});

async function testConnection() {
  console.log('Testing database connection...');
  console.log('Config:', {
    host: process.env.PG_HOST,
    port: process.env.PG_PORT,
    database: process.env.PG_DB,
    user: process.env.PG_USER,
  });

  try {
    const client = await pool.connect();
    console.log('✓ Successfully connected to database');

    // Test dengue_weather table
    const dengueResult = await client.query(`
      SELECT COUNT(*) as count
      FROM dengue_weather
      WHERE weekly_hospitalised_cases IS NOT NULL
    `);
    console.log(`✓ Found ${dengueResult.rows[0].count} dengue records`);

    // Test malaria_weather table
    const malariaResult = await client.query(`
      SELECT COUNT(*) as count
      FROM malaria_weather
      WHERE pf IS NOT NULL OR pv IS NOT NULL
    `);
    console.log(`✓ Found ${malariaResult.rows[0].count} malaria records`);

    // Test awd_weather table
    const awdResult = await client.query(`
      SELECT COUNT(*) as count
      FROM awd_weather
      WHERE daily_cases IS NOT NULL
    `);
    console.log(`✓ Found ${awdResult.rows[0].count} AWD/diarrhoea records`);

    client.release();
    console.log('\n✅ All database tests passed!');
  } catch (error) {
    console.error('❌ Database connection error:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

testConnection();
