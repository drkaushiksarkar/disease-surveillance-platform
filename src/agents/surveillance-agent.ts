/**
 * Autonomous surveillance agent for disease early warning.
 *
 * Event-driven agent that subscribes to data streams, triggers
 * analysis autonomously, and maintains situational awareness state.
 * Implements tool-calling pattern with typed tool definitions.
 */

interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  handler: (args: Record<string, unknown>) => Promise<Record<string, unknown>>;
}

interface Signal {
  source: string;
  country: string;
  indicator: string;
  value: number;
  baseline: number;
  timestamp: number;
}

interface SituationalState {
  activeAlerts: Map<string, Alert>;
  signalBuffer: Signal[];
  lastUpdate: number;
}

interface Alert {
  id: string;
  severity: "info" | "warning" | "critical";
  country: string;
  indicator: string;
  message: string;
  detectedAt: number;
  acknowledgedAt?: number;
}

export class SurveillanceAgent {
  private tools: Map<string, ToolDefinition> = new Map();
  private state: SituationalState;

  constructor() {
    this.state = {
      activeAlerts: new Map(),
      signalBuffer: [],
      lastUpdate: Date.now(),
    };
    this.registerTools();
  }

  private registerTools(): void {
    this.registerTool({
      name: "analyzeSignal",
      description: "Analyze an incoming epidemiological signal for anomalies",
      parameters: { required: ["signal"], properties: { signal: { type: "object" } } },
      handler: async (args) => this.analyzeSignal(args.signal as Signal),
    });

    this.registerTool({
      name: "detectAnomaly",
      description: "Run statistical anomaly detection on signal buffer",
      parameters: { required: ["country", "indicator"], properties: { country: { type: "string" }, indicator: { type: "string" } } },
      handler: async (args) => this.detectAnomaly(args.country as string, args.indicator as string),
    });

    this.registerTool({
      name: "correlateOutbreak",
      description: "Cross-correlate signals across geographic regions and indicators",
      parameters: { required: ["alerts"], properties: { alerts: { type: "array" } } },
      handler: async (args) => this.correlateOutbreak(args.alerts as Alert[]),
    });

    this.registerTool({
      name: "generateSitRep",
      description: "Generate situation report from current surveillance state",
      parameters: { properties: { format: { type: "string", enum: ["brief", "detailed"] } } },
      handler: async (args) => this.generateSitRep((args.format as string) || "brief"),
    });
  }

  private registerTool(tool: ToolDefinition): void {
    this.tools.set(tool.name, tool);
  }

  async executeTool(name: string, args: Record<string, unknown>): Promise<Record<string, unknown>> {
    const tool = this.tools.get(name);
    if (!tool) {
      throw new Error(`Tool not found: ${name}`);
    }
    return tool.handler(args);
  }

  async processSignal(signal: Signal): Promise<void> {
    this.state.signalBuffer.push(signal);
    this.state.lastUpdate = Date.now();

    if (this.state.signalBuffer.length > 1000) {
      this.state.signalBuffer = this.state.signalBuffer.slice(-500);
    }

    const analysis = await this.executeTool("analyzeSignal", { signal });

    if (analysis.anomalyDetected) {
      const anomaly = await this.executeTool("detectAnomaly", {
        country: signal.country,
        indicator: signal.indicator,
      });

      if (anomaly.confirmed) {
        const alert: Alert = {
          id: crypto.randomUUID().slice(0, 12),
          severity: anomaly.severity as "info" | "warning" | "critical",
          country: signal.country,
          indicator: signal.indicator,
          message: `Anomaly detected: ${signal.indicator} in ${signal.country}`,
          detectedAt: Date.now(),
        };
        this.state.activeAlerts.set(alert.id, alert);
      }
    }
  }

  private async analyzeSignal(signal: Signal): Promise<Record<string, unknown>> {
    const deviation = signal.baseline > 0 ? Math.abs(signal.value - signal.baseline) / signal.baseline : 0;
    return {
      anomalyDetected: deviation > 0.3,
      deviation,
      zscore: deviation * 2.5,
      signal: { country: signal.country, indicator: signal.indicator },
    };
  }

  private async detectAnomaly(country: string, indicator: string): Promise<Record<string, unknown>> {
    const relevant = this.state.signalBuffer.filter(
      (s) => s.country === country && s.indicator === indicator
    );

    if (relevant.length < 3) {
      return { confirmed: false, reason: "insufficient_data" };
    }

    const values = relevant.map((s) => s.value);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const std = Math.sqrt(values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length);
    const latest = values[values.length - 1];
    const zscore = std > 0 ? Math.abs(latest - mean) / std : 0;

    return {
      confirmed: zscore > 2.0,
      severity: zscore > 3.0 ? "critical" : zscore > 2.0 ? "warning" : "info",
      zscore: Math.round(zscore * 100) / 100,
      sampleSize: relevant.length,
    };
  }

  private async correlateOutbreak(alerts: Alert[]): Promise<Record<string, unknown>> {
    const byCountry = new Map<string, Alert[]>();
    for (const alert of alerts) {
      const existing = byCountry.get(alert.country) || [];
      existing.push(alert);
      byCountry.set(alert.country, existing);
    }

    const clusters: Array<{ countries: string[]; indicators: string[]; severity: string }> = [];
    const countries = [...byCountry.keys()];

    if (countries.length >= 2) {
      const indicators = [...new Set(alerts.map((a) => a.indicator))];
      clusters.push({
        countries,
        indicators,
        severity: alerts.some((a) => a.severity === "critical") ? "critical" : "warning",
      });
    }

    return { clusters, correlatedAlerts: alerts.length, geographicSpread: countries.length };
  }

  private async generateSitRep(format: string): Promise<Record<string, unknown>> {
    const activeAlerts = [...this.state.activeAlerts.values()];
    const critical = activeAlerts.filter((a) => a.severity === "critical").length;
    const warning = activeAlerts.filter((a) => a.severity === "warning").length;

    return {
      format,
      generatedAt: new Date().toISOString(),
      summary: {
        totalActiveAlerts: activeAlerts.length,
        critical,
        warning,
        info: activeAlerts.length - critical - warning,
        countriesAffected: [...new Set(activeAlerts.map((a) => a.country))].length,
        signalsProcessed: this.state.signalBuffer.length,
      },
      alerts: format === "detailed" ? activeAlerts : activeAlerts.slice(0, 5),
    };
  }

  getTools(): Array<{ name: string; description: string }> {
    return [...this.tools.values()].map((t) => ({
      name: t.name,
      description: t.description,
    }));
  }
}
