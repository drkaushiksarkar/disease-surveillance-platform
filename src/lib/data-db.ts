/**
 * Database-backed data access layer
 *
 * This module provides functions to fetch data from PostgreSQL instead of static JSON files.
 * It replaces the static imports from model-output.json and diarrhoea-data.json
 */

import { query, table } from '@/lib/db';
import type { TimeSeriesDataPoint, AccelerationAlertData } from '@/lib/types';

/**
 * Get time series data for a specific district and disease from database
 */
export async function getRealTimeSeriesDataFromDB(
  districtName: string,
  disease: string
): Promise<TimeSeriesDataPoint[]> {
  const tableName = disease === 'dengue' ? 'dengue_predictions' : 'diarrhoea_predictions';

  if (disease !== 'dengue' && disease !== 'diarrhoea') {
    return [];
  }

  try {
    const result = await query<{
      date: string;
      actual: number | null;
      predicted: number;
      uncertainty_lower: number;
      uncertainty_upper: number;
      is_outbreak: boolean;
    }>(
      `SELECT date::text, actual, predicted, uncertainty_lower, uncertainty_upper, is_outbreak
       FROM ${table(tableName)}
       WHERE LOWER(district) = LOWER($1)
       ORDER BY date ASC`,
      [districtName]
    );

    return result.rows.map((row) => ({
      date: row.date,
      actual: row.actual,
      predicted: row.predicted,
      uncertainty: [row.uncertainty_lower, row.uncertainty_upper],
      is_outbreak: row.is_outbreak,
    }));
  } catch (error) {
    console.error('Error fetching time series data from database:', error);
    return [];
  }
}

/**
 * Get aggregated dengue predictions by district from database
 */
export async function getAggregatedDenguePredictionsFromDB(): Promise<{
  [districtName: string]: number;
}> {
  try {
    const result = await query<{ district: string; total: number }>(
      `SELECT district, SUM(predicted) as total
       FROM ${table('dengue_predictions')}
       GROUP BY district`
    );

    const totals: { [districtName: string]: number } = {};
    result.rows.forEach((row) => {
      // Capitalize first letter to match existing format
      const districtName = row.district.charAt(0).toUpperCase() + row.district.slice(1);
      totals[districtName] = row.total;
    });

    return totals;
  } catch (error) {
    console.error('Error fetching aggregated dengue predictions:', error);
    return {};
  }
}

/**
 * Get aggregated diarrhoea predictions by district from database
 */
export async function getAggregatedDiarrhoeaPredictionsFromDB(): Promise<{
  [districtName: string]: number;
}> {
  try {
    const result = await query<{ district: string; total: number }>(
      `SELECT district, SUM(predicted) as total
       FROM ${table('diarrhoea_predictions')}
       GROUP BY district`
    );

    const totals: { [districtName: string]: number } = {};
    result.rows.forEach((row) => {
      // Capitalize first letter to match existing format
      const districtName = row.district.charAt(0).toUpperCase() + row.district.slice(1);
      totals[districtName] = row.total;
    });

    return totals;
  } catch (error) {
    console.error('Error fetching aggregated diarrhoea predictions:', error);
    return {};
  }
}

/**
 * Get all time series data for a specific disease (used for alert calculations)
 */
export async function getAllTimeSeriesDataFromDB(disease: string): Promise<
  Array<{
    date: string;
    district: string;
    actual: number | null;
    predicted: number;
    uncertainty: [number, number];
    is_outbreak: boolean;
  }>
> {
  const tableName = disease === 'dengue' ? 'dengue_predictions' : 'diarrhoea_predictions';

  if (disease !== 'dengue' && disease !== 'diarrhoea') {
    return [];
  }

  try {
    const result = await query<{
      date: string;
      district: string;
      actual: number | null;
      predicted: number;
      uncertainty_lower: number;
      uncertainty_upper: number;
      is_outbreak: boolean;
    }>(
      `SELECT date::text, district, actual, predicted, uncertainty_lower, uncertainty_upper, is_outbreak
       FROM ${table(tableName)}
       ORDER BY date ASC`
    );

    return result.rows.map((row) => ({
      date: row.date,
      district: row.district,
      actual: row.actual,
      predicted: row.predicted,
      uncertainty: [row.uncertainty_lower, row.uncertainty_upper],
      is_outbreak: row.is_outbreak,
    }));
  } catch (error) {
    console.error('Error fetching all time series data:', error);
    return [];
  }
}

/**
 * Get available districts for a disease from database
 */
export async function getAvailableDistrictsFromDB(disease: string): Promise<string[]> {
  const tableName = disease === 'dengue' ? 'dengue_predictions' : 'diarrhoea_predictions';

  if (disease !== 'dengue' && disease !== 'diarrhoea') {
    return [];
  }

  try {
    const result = await query<{ district: string }>(
      `SELECT DISTINCT district
       FROM ${table(tableName)}
       ORDER BY district`
    );

    return result.rows.map((row) => row.district);
  } catch (error) {
    console.error('Error fetching available districts:', error);
    return [];
  }
}

/**
 * Get malaria predictions from database
 * Uses malaria_pv_predictions and malaria_pf_predictions tables
 * mixed_rate is calculated as the sum of pv and pf predicted_cases values
 */
export async function getMalariaPredictionsFromDB(): Promise<
  Array<{
    upazila_id: string;
    pv_rate: number;
    pf_rate: number;
    mixed_rate: number;
  }>
> {
  try {
    // Get latest period data from both tables
    const result = await query<{
      upazila: string;
      pv_forecast: number | null;
      pf_forecast: number | null;
    }>(
      `WITH latest_pv AS (
         SELECT DISTINCT ON (upazila) upazila, predicted_cases as pv_forecast
         FROM ${table('malaria_pv_predictions')}
         WHERE year = (SELECT MAX(year) FROM ${table('malaria_pv_predictions')})
           AND month = (SELECT MAX(month) FROM ${table('malaria_pv_predictions')}
                           WHERE year = (SELECT MAX(year) FROM ${table('malaria_pv_predictions')}))
         ORDER BY upazila, period_start DESC
       ),
       latest_pf AS (
         SELECT DISTINCT ON (upazila) upazila, predicted_cases as pf_forecast
         FROM ${table('malaria_pf_predictions')}
         WHERE year = (SELECT MAX(year) FROM ${table('malaria_pf_predictions')})
           AND month = (SELECT MAX(month) FROM ${table('malaria_pf_predictions')}
                           WHERE year = (SELECT MAX(year) FROM ${table('malaria_pf_predictions')}))
         ORDER BY upazila, period_start DESC
       )
       SELECT
         COALESCE(pv.upazila, pf.upazila) as upazila,
         COALESCE(pv.pv_forecast, 0) as pv_forecast,
         COALESCE(pf.pf_forecast, 0) as pf_forecast
       FROM latest_pv pv
       FULL OUTER JOIN latest_pf pf ON pv.upazila = pf.upazila
       ORDER BY upazila`
    );

    // Calculate mixed_rate as sum of pv and pf forecasts
    return result.rows.map(row => ({
      upazila_id: row.upazila,
      pv_rate: Math.round(row.pv_forecast || 0),
      pf_rate: Math.round(row.pf_forecast || 0),
      mixed_rate: Math.round((row.pv_forecast || 0) + (row.pf_forecast || 0)),
    }));
  } catch (error) {
    console.error('Error fetching malaria predictions:', error);
    return [];
  }
}

/**
 * Get top districts by last week cases from acceleration_alerts table
 */
export async function getTopDistrictsByLastWeekCasesFromDB(
  disease: string,
  limit: number = 6
): Promise<AccelerationAlertData[]> {
  // Map disease to acceleration_alerts table name
  const tableMap: { [key: string]: string } = {
    dengue: 'dengue_acceleration_alerts',
    diarrhoea: 'diarrhoea_acceleration_alerts',
    malaria_pf: 'malaria_pf_acceleration_alerts',
    malaria_pv: 'malaria_pv_acceleration_alerts',
  };

  const tableName = tableMap[disease];
  if (!tableName) {
    console.warn(`No acceleration_alerts table for disease: ${disease}`);
    return [];
  }

  try {
    // For malaria, use month instead of epi_week
    if (disease === 'malaria_pf' || disease === 'malaria_pv') {
      // Query the acceleration_alerts table directly - it already has the computed columns
      const result = await query<AccelerationAlertData>(
        `SELECT DISTINCT ON (district)
          district,
          year,
          month as epi_week,
          last_week_cases,
          this_week_actual,
          this_week_predicted,
          next_week_forecast,
          growth_rate_wow,
          growth_flag
         FROM ${table(tableName)}
         WHERE year = (SELECT MAX(year) FROM ${table(tableName)})
           AND month = (SELECT MAX(month) FROM ${table(tableName)} WHERE year = (SELECT MAX(year) FROM ${table(tableName)}))
         ORDER BY district, this_week_actual DESC NULLS LAST`,
        []
      );

      // Sort by last_week_cases and limit
      const sortedResults = result.rows
        .sort((a, b) => (b.last_week_cases || 0) - (a.last_week_cases || 0))
        .slice(0, limit);

      return sortedResults;
    } else {
      // For dengue and diarrhoea, query the acceleration_alerts table
      const result = await query<AccelerationAlertData>(
        `SELECT DISTINCT ON (district)
          district,
          year,
          epi_week,
          last_week_cases,
          this_week_actual,
          this_week_predicted,
          next_week_forecast,
          growth_rate_wow,
          growth_flag
         FROM ${table(tableName)}
         WHERE year = (SELECT MAX(year) FROM ${table(tableName)})
           AND epi_week = (SELECT MAX(epi_week) FROM ${table(tableName)} WHERE year = (SELECT MAX(year) FROM ${table(tableName)}))
         ORDER BY district, this_week_actual DESC NULLS LAST`,
        []
      );

      // Sort by last_week_cases and limit
      const sortedResults = result.rows
        .sort((a, b) => (b.last_week_cases || 0) - (a.last_week_cases || 0))
        .slice(0, limit);

      return sortedResults;
    }
  } catch (error) {
    console.error(`Error fetching acceleration alerts for ${disease}:`, error);
    return [];
  }
}

/**
 * Helper function to properly capitalize district names
 * Converts "cox's bazar" -> "Cox's Bazar", "cumilla" -> "Cumilla"
 */
function capitalizeDistrictName(name: string): string {
  return name
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Get aggregated district predictions from predictions table for disease maps
 * Returns a mapping of district names to predicted cases
 */
export async function getDistrictPredictionsFromAccelerationAlerts(
  disease: string
): Promise<{ [districtName: string]: number }> {
  // Map disease to table name
  const tableMap: { [key: string]: string } = {
    dengue: 'dengue_predictions',
    diarrhoea: 'diarrhoea_predictions',
    malaria_pf: 'malaria_pf_predictions',
    malaria_pv: 'malaria_pv_predictions',
  };

  const tableName = tableMap[disease];
  if (!tableName) {
    console.warn(`No predictions table for disease: ${disease}`);
    return {};
  }

  try {
    // For malaria, use month instead of epi_week
    if (disease === 'malaria_pf' || disease === 'malaria_pv') {
      const result = await query<{ district: string; predicted_cases: number }>(
        `SELECT DISTINCT ON (district)
          district,
          predicted_cases
         FROM ${tableName}
         WHERE year = (SELECT MAX(year) FROM ${tableName})
           AND month = (SELECT MAX(month) FROM ${tableName} WHERE year = (SELECT MAX(year) FROM ${tableName}))
         ORDER BY district, period_start DESC`
      );

      const totals: { [districtName: string]: number } = {};
      result.rows.forEach((row) => {
        // Properly capitalize district names to match GeoJSON format
        const districtName = capitalizeDistrictName(row.district);
        totals[districtName] = row.predicted_cases || 0;
      });

      return totals;
    } else {
      const result = await query<{ district: string; predicted_cases: number }>(
        `SELECT DISTINCT ON (district)
          district,
          predicted_cases
         FROM ${tableName}
         WHERE year = (SELECT MAX(year) FROM ${tableName})
           AND epi_week = (SELECT MAX(epi_week) FROM ${tableName} WHERE year = (SELECT MAX(year) FROM ${tableName}))
         ORDER BY district, report_date DESC`
      );

      const totals: { [districtName: string]: number } = {};
      result.rows.forEach((row) => {
        // Properly capitalize district names to match GeoJSON format
        const districtName = capitalizeDistrictName(row.district);
        totals[districtName] = row.predicted_cases || 0;
      });

      return totals;
    }
  } catch (error) {
    console.error(`Error fetching district predictions for ${disease}:`, error);
    return {};
  }
}
