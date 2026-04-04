export interface CountrySchema {
  iso3: string; iso2: string; name: string; region: string;
  subRegion?: string; incomeGroup?: string; population?: number;
  centroid?: [number, number]; adminLevels?: number;
}

export interface AdminRegion {
  id: string; name: string; level: number; parentId?: string;
  iso3: string; population?: number;
}

export function validateIso3(iso3: string): boolean {
  return /^[A-Z]{3}$/.test(iso3);
}

export const WHO_REGIONS: Record<string, string> = {
  AFR: "Sub-Saharan Africa", SEAR: "South-East Asia",
  EMR: "Eastern Mediterranean", WPR: "Western Pacific",
  AMR: "Americas", EUR: "Europe",
};
