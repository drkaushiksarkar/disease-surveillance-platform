import { Alert, AlertRule, AlertSeverity, evaluateRule } from "../schemas/alert";

export class AlertService {
  private rules: AlertRule[] = [];
  private active = new Map<string, Alert>();
  private cooldowns = new Map<string, number>();

  addRule(rule: AlertRule): void { this.rules.push(rule); }

  evaluate(indicator: string, entity: string, value: number): Alert[] {
    const triggered: Alert[] = [];
    for (const rule of this.rules) {
      if (rule.indicator !== indicator || !rule.enabled) continue;
      const key = `${rule.ruleId}:${entity}`;
      const cooldown = this.cooldowns.get(key);
      if (cooldown && Date.now() - cooldown < (rule.cooldownHours || 24) * 3600000) continue;
      if (evaluateRule(rule, value)) {
        const alert: Alert = {
          alertId: `${rule.ruleId}-${Date.now()}`, alertType: "threshold_breach" as any,
          severity: rule.severity, title: `${indicator} threshold breach`,
          description: `Value ${value} exceeds threshold ${rule.threshold}`,
          entity, indicator, value, threshold: rule.threshold,
          createdAt: new Date().toISOString(), acknowledged: false, resolved: false,
        };
        triggered.push(alert);
        this.active.set(key, alert);
        this.cooldowns.set(key, Date.now());
      }
    }
    return triggered;
  }

  get activeCount(): number { return this.active.size; }
}
