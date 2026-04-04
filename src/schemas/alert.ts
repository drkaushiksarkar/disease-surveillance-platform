export enum AlertSeverity { Critical = "critical", High = "high", Medium = "medium", Low = "low", Info = "info" }
export enum AlertType { Outbreak = "outbreak", ThresholdBreach = "threshold_breach", Anomaly = "anomaly", DataQuality = "data_quality" }

export interface Alert {
  alertId: string; alertType: AlertType; severity: AlertSeverity;
  title: string; description: string; entity: string;
  indicator?: string; value?: number; threshold?: number;
  createdAt: string; acknowledged: boolean; resolved: boolean;
}

export interface AlertRule {
  ruleId: string; indicator: string; condition: "gt" | "gte" | "lt" | "lte" | "eq";
  threshold: number; severity: AlertSeverity; cooldownHours?: number; enabled: boolean;
}

export function evaluateRule(rule: AlertRule, value: number): boolean {
  if (!rule.enabled) return false;
  const ops: Record<string, boolean> = {
    gt: value > rule.threshold, gte: value >= rule.threshold,
    lt: value < rule.threshold, lte: value <= rule.threshold,
    eq: value === rule.threshold,
  };
  return ops[rule.condition] ?? false;
}
