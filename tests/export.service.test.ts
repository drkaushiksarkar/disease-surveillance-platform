import { ExportService } from "../src/services/export.service";

describe("ExportService", () => {
  const service = new ExportService();
  const records = [
    { iso3: "BGD", year: 2024, value: 100.5, lat: 23.6, lon: 90.3 },
    { iso3: "IND", year: 2024, value: 200.3, lat: 28.6, lon: 77.2 },
  ];

  it("exports CSV", () => {
    const csv = service.toCsv(records);
    expect(csv).toContain("iso3");
    expect(csv).toContain("BGD");
    expect(csv.split("\n")).toHaveLength(3);
  });

  it("exports CSV with column filter", () => {
    const csv = service.toCsv(records, ["iso3", "value"]);
    expect(csv.split("\n")[0]).not.toContain("year");
  });

  it("exports JSON", () => {
    const json = JSON.parse(service.toJson(records));
    expect(json.count).toBe(2);
  });

  it("exports GeoJSON", () => {
    const geojson = JSON.parse(service.toGeoJson(records));
    expect(geojson.type).toBe("FeatureCollection");
    expect(geojson.features).toHaveLength(2);
  });

  it("handles empty input", () => {
    expect(service.toCsv([])).toBe("");
  });
});
