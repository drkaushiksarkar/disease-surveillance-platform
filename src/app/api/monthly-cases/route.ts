import { NextResponse } from 'next/server';
import { query, table } from '@/lib/db';
import type { DiseaseData } from '@/lib/types';

export const dynamic = 'force-dynamic';

const numberFormatter = new Intl.NumberFormat('en-US');

const THRESHOLDS: Record<'malaria' | 'dengue' | 'diarrhoea', number> = {
  malaria: 4000,
  dengue: 10000,
  diarrhoea: 8000,
};

type WeeklyTotalsRow = {
  year: number | null;
  epi_week: number | null;
  actual_total: string | number | null;
  forecast_total: string | number | null;
  valid_districts: string | number | null;
};

type MonthlyTotalsRow = {
  actual_total: string | number | null;
  forecast_total: string | number | null;
  valid_units: string[] | null;
};

type YearWeek = { year: number; epi_week: number };
type YearMonth = { year: number; month: number };

function formatNumber(value: number): string {
  return numberFormatter.format(Math.round(value));
}

function percentDifference(forecast: number, actual: number): number {
  if (!Number.isFinite(actual) || actual === 0) {
    return 0;
  }
  const diff = ((forecast - actual) / actual) * 100;
  if (!Number.isFinite(diff)) {
    return 0;
  }
  return Math.round(diff);
}

function monthLabel(year: number, month: number): string {
  const date = new Date(year, month - 1);
  return `${date.toLocaleString('en-US', { month: 'long' })} ${year}`;
}

function formatCount(count: number, singular: string): string {
  const unit = count === 1 ? singular : `${singular}s`;
  return `${count} ${unit}`;
}

function isMissingRelation(error: unknown): boolean {
  return typeof error === 'object' && error !== null && (error as { code?: string }).code === '42P01';
}

function buildTableCandidates(baseTable: string): string[] {
  const defaultName = table(baseTable);
  const [schemaPart, tablePart] = defaultName.includes('.')
    ? defaultName.split('.')
    : [undefined, defaultName];

  const bareTable = tablePart ?? baseTable;

  const candidates = new Set<string>();
  if (schemaPart) {
    candidates.add(`${schemaPart}.${bareTable}`);
  }
  candidates.add(defaultName);
  candidates.add(`public.${bareTable}`);

  return Array.from(candidates);
}

async function tryQuery<T>(tables: string[], buildSql: (tbl: string) => string): Promise<T | null> {
  let lastError: unknown = null;

  for (const tbl of tables) {
    const sql = buildSql(tbl);
    try {
      const result = await query<T>(sql);
      return result.rows[0] ?? null;
    } catch (error) {
      lastError = error;
      if (!isMissingRelation(error)) {
        throw error;
      }
    }
  }

  if (lastError && !isMissingRelation(lastError)) {
    throw lastError;
  }

  return null;
}

async function fetchLatestYearWeek(tables: string[]): Promise<YearWeek | null> {
  const sqlBuilder = (tbl: string) => `
    SELECT year, epi_week
    FROM ${tbl}
    WHERE year IS NOT NULL AND epi_week IS NOT NULL
    ORDER BY year DESC, epi_week DESC
    LIMIT 1
  `;

  const result = await tryQuery<{ year: number; epi_week: number }>(tables, sqlBuilder);
  return result ? { year: result.year, epi_week: result.epi_week } : null;
}

async function fetchWeeklyTotals(baseTable: string): Promise<DiseaseData | null> {
  const tables = buildTableCandidates(baseTable);
  const latest = await fetchLatestYearWeek(tables);

  if (!latest) {
    return null;
  }

  const sqlBuilder = (tbl: string) => `
    SELECT
      ${latest.year} AS year,
      ${latest.epi_week} AS epi_week,
      COALESCE(SUM(actual_cases), 0) AS actual_total,
      COALESCE(SUM(predicted_cases), 0) AS forecast_total,
      COUNT(DISTINCT CASE WHEN actual_cases IS NOT NULL THEN district END) AS valid_districts
    FROM ${tbl}
    WHERE year = ${latest.year} AND epi_week = ${latest.epi_week}
  `;

  const row = await tryQuery<WeeklyTotalsRow>(tables, sqlBuilder);
  if (!row) {
    return null;
  }

  const actual = Number(row.actual_total) || 0;
  const forecast = Number(row.forecast_total) || 0;
  const districtCount = Number(row.valid_districts) || 0;

  const label = baseTable.startsWith('dengue') ? 'Dengue' : 'Diarrhoea';
  const thresholdKey = baseTable.startsWith('dengue') ? 'dengue' : 'diarrhoea';

  return {
    label,
    value: formatNumber(forecast),
    trend: percentDifference(forecast, actual),
    is_high: forecast > THRESHOLDS[thresholdKey],
    periodLabel: `Week ${latest.epi_week}, ${latest.year}`,
    comparisonLabel: 'This week actual',
    comparisonValue: `${formatNumber(actual)} (${formatCount(districtCount, 'district')})`,
  };
}

async function fetchLatestYearMonth(tables: string[]): Promise<YearMonth | null> {
  let latest: YearMonth | null = null;

  for (const tbl of tables) {
    try {
      const result = await query<{ year: number; month: number }>(`
        SELECT year, month
        FROM ${tbl}
        WHERE year IS NOT NULL AND month IS NOT NULL
        ORDER BY year DESC, month DESC
        LIMIT 1
      `);

      const row = result.rows[0];
      if (row) {
        if (
          !latest ||
          row.year > latest.year ||
          (row.year === latest.year && row.month > latest.month)
        ) {
          latest = { year: row.year, month: row.month };
        }
      }
    } catch (error) {
      if (!isMissingRelation(error)) {
        throw error;
      }
    }
  }

  return latest;
}

async function fetchMonthlyTotalsForTables(
  tables: string[],
  target: YearMonth
): Promise<{ actual: number; forecast: number; validUnits: Set<string> }> {
  let actual = 0;
  let forecast = 0;
  const validUnits = new Set<string>();

  for (const tbl of tables) {
    try {
      const result = await query<MonthlyTotalsRow>(`
        SELECT
          COALESCE(SUM(actual_cases), 0) AS actual_total,
          COALESCE(SUM(predicted_cases), 0) AS forecast_total,
          ARRAY_REMOVE(ARRAY_AGG(DISTINCT CASE WHEN actual_cases IS NOT NULL THEN upazila END), NULL) AS valid_units
        FROM ${tbl}
        WHERE year = ${target.year} AND month = ${target.month}
      `);
      const row = result.rows[0];
      if (row) {
        actual += Number(row.actual_total) || 0;
        forecast += Number(row.forecast_total) || 0;
        (row.valid_units ?? []).forEach(unit => {
          if (unit) {
            validUnits.add(unit);
          }
        });
      }
    } catch (error) {
      if (!isMissingRelation(error)) {
        throw error;
      }
    }
  }

  return { actual, forecast, validUnits };
}

async function fetchMalariaTotals(): Promise<DiseaseData | null> {
  const pfTables = buildTableCandidates('malaria_pf_predictions');
  const pvTables = buildTableCandidates('malaria_pv_predictions');

  const latestPf = await fetchLatestYearMonth(pfTables);
  const latestPv = await fetchLatestYearMonth(pvTables);

  const candidates = [latestPf, latestPv].filter(
    (value): value is YearMonth => value !== null
  );

  if (candidates.length === 0) {
    return null;
  }

  const latest = candidates.reduce((acc, current) => {
    if (!acc) return current;
    if (
      current.year > acc.year ||
      (current.year === acc.year && current.month > acc.month)
    ) {
      return current;
    }
    return acc;
  }, candidates[0]);

  const pfTotals = await fetchMonthlyTotalsForTables(pfTables, latest);
  const pvTotals = await fetchMonthlyTotalsForTables(pvTables, latest);

  const actual = pfTotals.actual + pvTotals.actual;
  const forecast = pfTotals.forecast + pvTotals.forecast;
  const upazilaSet = new Set<string>([
    ...pfTotals.validUnits,
    ...pvTotals.validUnits,
  ]);

  return {
    label: 'Malaria',
    value: formatNumber(forecast),
    trend: percentDifference(forecast, actual),
    is_high: forecast > THRESHOLDS.malaria,
    periodLabel: monthLabel(latest.year, latest.month),
    comparisonLabel: 'This month actual',
    comparisonValue: `${formatNumber(actual)} (${formatCount(upazilaSet.size, 'upazila')})`,
  };
}

export async function GET() {
  try {
    const [malaria, dengue, diarrhoea] = await Promise.all([
      fetchMalariaTotals(),
      fetchWeeklyTotals('dengue_predictions'),
      fetchWeeklyTotals('diarrhoea_predictions'),
    ]);

    const cards = [malaria, dengue, diarrhoea].filter(
      (card): card is DiseaseData => card !== null
    );

    if (cards.length === 0) {
      return NextResponse.json(
        { error: 'No metrics available' },
        { status: 404 }
      );
    }

    return NextResponse.json({ cards });
  } catch (error) {
    console.error('Error fetching metrics from database:', error);
    return NextResponse.json(
      { error: 'Failed to fetch metrics' },
      { status: 500 }
    );
  }
}
