export class ExportService {
  toCsv(records: Record<string, unknown>[], columns?: string[]): string {
    if (!records.length) return "";
    const cols = columns || Object.keys(records[0]);
    const header = cols.join(",");
    const rows = records.map((r) => cols.map((c) => String(r[c] ?? "")).join(","));
    return [header, ...rows].join("\n");
  }

  toJson(records: Record<string, unknown>[]): string {
    return JSON.stringify({ data: records, count: records.length }, null, 2);
  }

  toGeoJson(records: Record<string, unknown>[], latField = "lat", lonField = "lon"): string {
    const features = records
      .filter((r) => r[latField] != null && r[lonField] != null)
      .map((r) => ({
        type: "Feature" as const,
        geometry: { type: "Point" as const, coordinates: [Number(r[lonField]), Number(r[latField])] },
        properties: Object.fromEntries(Object.entries(r).filter(([k]) => k !== latField && k !== lonField)),
      }));
    return JSON.stringify({ type: "FeatureCollection", features });
  }
}
