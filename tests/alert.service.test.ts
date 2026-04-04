import { AlertService } from "../src/services/alert.service";
import { AlertSeverity } from "../src/schemas/alert";

describe("AlertService", () => {
  let service: AlertService;
  beforeEach(() => {
    service = new AlertService();
    service.addRule({ ruleId: "high_cases", indicator: "CASES", condition: "gt", threshold: 1000, severity: AlertSeverity.High, enabled: true });
  });

  it("triggers on threshold breach", () => {
    const alerts = service.evaluate("CASES", "BGD", 1500);
    expect(alerts).toHaveLength(1);
    expect(alerts[0].severity).toBe(AlertSeverity.High);
  });

  it("no trigger below threshold", () => {
    expect(service.evaluate("CASES", "BGD", 500)).toHaveLength(0);
  });

  it("tracks active count", () => {
    service.evaluate("CASES", "BGD", 1500);
    expect(service.activeCount).toBe(1);
  });
});
