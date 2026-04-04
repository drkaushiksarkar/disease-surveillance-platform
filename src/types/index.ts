export type ISO3 = string & { readonly __brand: "ISO3" };
export type IndicatorCode = string & { readonly __brand: "IndicatorCode" };
export type ForecastId = string & { readonly __brand: "ForecastId" };

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface TimeRange {
  start: string;
  end: string;
}

export interface GeoPoint {
  lat: number;
  lon: number;
}

export interface BoundingBox {
  north: number;
  south: number;
  east: number;
  west: number;
}
