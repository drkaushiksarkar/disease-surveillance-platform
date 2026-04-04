type Record = { [key: string]: unknown };

export function normalizeIso3(records: Record[], field = "iso3"): Record[] {
  return records.map((r) => ({ ...r, [field]: typeof r[field] === "string" ? (r[field] as string).toUpperCase().trim() : r[field] }));
}

export function filterNulls(records: Record[], requiredFields: string[]): Record[] {
  return records.filter((r) => requiredFields.every((f) => r[f] != null));
}

export function deduplicate(records: Record[], keyFields: string[]): Record[] {
  const seen = new Set<string>();
  return records.filter((r) => {
    const key = keyFields.map((f) => String(r[f])).join("|");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function castNumeric(records: Record[], fields: string[]): Record[] {
  return records.map((r) => {
    const copy = { ...r };
    for (const f of fields) { if (f in copy) { const n = Number(copy[f]); copy[f] = isNaN(n) ? null : n; } }
    return copy;
  });
}

export function clipValues(records: Record[], field: string, min?: number, max?: number): Record[] {
  return records.map((r) => {
    if (typeof r[field] !== "number") return r;
    let v = r[field] as number;
    if (min !== undefined) v = Math.max(v, min);
    if (max !== undefined) v = Math.min(v, max);
    return { ...r, [field]: v };
  });
}
