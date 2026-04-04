export enum Frequency { Daily = "daily", Weekly = "weekly", Monthly = "monthly", Annual = "annual" }

export interface TimeSeriesPoint { timestamp: string; value: number; qualityFlag?: string; source?: string; }

export interface TimeSeries {
  indicator: string; entity: string; frequency: Frequency;
  points: TimeSeriesPoint[]; metadata?: Record<string, unknown>;
}

export function sliceTimeSeries(ts: TimeSeries, start: string, end: string): TimeSeries {
  return { ...ts, points: ts.points.filter((p) => p.timestamp >= start && p.timestamp <= end) };
}

export function detectOutliers(ts: TimeSeries, zThreshold = 3.0): number[] {
  const vals = ts.points.map((p) => p.value);
  if (vals.length < 3) return [];
  const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
  const std = Math.sqrt(vals.reduce((a, v) => a + (v - mean) ** 2, 0) / vals.length);
  if (std === 0) return [];
  return vals.reduce<number[]>((acc, v, i) => { if (Math.abs(v - mean) / std > zThreshold) acc.push(i); return acc; }, []);
}

export function interpolateGaps(ts: TimeSeries): TimeSeries {
  const points = [...ts.points];
  for (let i = 1; i < points.length - 1; i++) {
    if (points[i].qualityFlag === "M") {
      points[i] = { ...points[i], value: (points[i - 1].value + points[i + 1].value) / 2, qualityFlag: "I" };
    }
  }
  return { ...ts, points };
}
