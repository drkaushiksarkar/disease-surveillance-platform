export enum IndicatorDomain { Health = "health", Climate = "climate", Economics = "economics", Demographics = "demographics" }
export enum AggregationMethod { Sum = "sum", Mean = "mean", WeightedMean = "weighted_mean", Rate = "rate" }

export interface IndicatorSchema {
  code: string; name: string; domain: IndicatorDomain; unit: string;
  aggregation: AggregationMethod; description?: string; source?: string;
  frequency?: string; minValue?: number; maxValue?: number; tags?: string[];
}

export function validateValue(schema: IndicatorSchema, value: number): boolean {
  if (schema.minValue !== undefined && value < schema.minValue) return false;
  if (schema.maxValue !== undefined && value > schema.maxValue) return false;
  return true;
}

export const CORE_INDICATORS: IndicatorSchema[] = [
  { code: "MALARIA_CASES", name: "Confirmed malaria cases", domain: IndicatorDomain.Health, unit: "cases", aggregation: AggregationMethod.Sum, minValue: 0 },
  { code: "TEMP_MEAN", name: "Mean temperature", domain: IndicatorDomain.Climate, unit: "celsius", aggregation: AggregationMethod.Mean, minValue: -60, maxValue: 60 },
  { code: "GDP_PER_CAPITA", name: "GDP per capita PPP", domain: IndicatorDomain.Economics, unit: "USD", aggregation: AggregationMethod.Mean, minValue: 0 },
  { code: "POPULATION", name: "Total population", domain: IndicatorDomain.Demographics, unit: "persons", aggregation: AggregationMethod.Sum, minValue: 0 },
];
