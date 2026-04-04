/**
 * Data validation framework for health intelligence pipelines.
 * Implements schema validation, range checks, and completeness audits.
 */

export enum Severity {
  Error = "error",
  Warning = "warning",
  Info = "info",
}

export interface ValidationResult {
  field: string;
  severity: Severity;
  message: string;
  value?: unknown;
  rule: string;
}

export interface ValidationReport {
  results: ValidationResult[];
  passed: boolean;
  summary: { total: number; errors: number; warnings: number };
}

export function createReport(results: ValidationResult[]): ValidationReport {
  const errors = results.filter((r) => r.severity === Severity.Error);
  return {
    results,
    passed: errors.length === 0,
    summary: {
      total: results.length,
      errors: errors.length,
      warnings: results.filter((r) => r.severity === Severity.Warning).length,
    },
  };
}

export function validateIso3(value: unknown): ValidationResult | null {
  if (typeof value !== "string" || !/^[A-Z]{3}$/.test(value)) {
    return { field: "iso3", severity: Severity.Error, message: `Invalid ISO3: ${value}`, value, rule: "iso3_format" };
  }
  return null;
}

export function validateYear(value: unknown, min = 1900, max = 2100): ValidationResult | null {
  if (typeof value !== "number" || value < min || value > max) {
    return { field: "year", severity: Severity.Error, message: `Year ${value} outside [${min}, ${max}]`, value, rule: "year_range" };
  }
  return null;
}

export function validateCompleteness(
  records: Record<string, unknown>[],
  requiredFields: string[],
  threshold = 0.95,
): ValidationReport {
  const results: ValidationResult[] = [];
  const total = records.length;
  if (total === 0) {
    results.push({ field: "dataset", severity: Severity.Error, message: "Empty dataset", rule: "non_empty" });
    return createReport(results);
  }
  for (const f of requiredFields) {
    const present = records.filter((r) => r[f] != null).length;
    const ratio = present / total;
    results.push({
      field: f,
      severity: ratio < threshold ? Severity.Error : Severity.Info,
      message: `Completeness ${(ratio * 100).toFixed(1)}%`,
      value: ratio,
      rule: "completeness",
    });
  }
  return createReport(results);
}
