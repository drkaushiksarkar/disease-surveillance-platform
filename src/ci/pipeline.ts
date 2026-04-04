/**
 * CI/CD pipeline configuration and workflow management.
 */

export enum PipelineStage {
  Lint = "lint",
  TypeCheck = "type_check",
  UnitTest = "unit_test",
  IntegrationTest = "integration_test",
  Build = "build",
  Deploy = "deploy",
}

export enum StageStatus {
  Pending = "pending",
  Running = "running",
  Passed = "passed",
  Failed = "failed",
  Skipped = "skipped",
}

export interface StageResult {
  stage: PipelineStage;
  status: StageStatus;
  durationMs: number;
  output: string;
  error?: string;
  artifacts: string[];
}

export interface PipelineConfig {
  stages: PipelineStage[];
  failFast: boolean;
  parallelStages: boolean;
  envVars: Record<string, string>;
  timeoutMs: number;
  workingDir: string;
}

export interface PipelineReport {
  totalStages: number;
  passed: number;
  failed: number;
  skipped: number;
  totalDurationMs: number;
  success: boolean;
  stages: Array<{
    name: string;
    status: string;
    durationMs: number;
    artifacts: string[];
  }>;
}

type StageHandler = () => Promise<StageResult>;

export class CIPipeline {
  private config: PipelineConfig;
  private results: StageResult[] = [];
  private handlers: Map<PipelineStage, StageHandler>;

  constructor(config: Partial<PipelineConfig> = {}) {
    this.config = {
      stages: Object.values(PipelineStage),
      failFast: true,
      parallelStages: false,
      envVars: {},
      timeoutMs: 3600000,
      workingDir: process.cwd(),
      ...config,
    };
    this.handlers = new Map([
      [PipelineStage.Lint, this.runLint.bind(this)],
      [PipelineStage.TypeCheck, this.runTypeCheck.bind(this)],
      [PipelineStage.UnitTest, this.runUnitTest.bind(this)],
      [PipelineStage.IntegrationTest, this.runIntegrationTest.bind(this)],
      [PipelineStage.Build, this.runBuild.bind(this)],
      [PipelineStage.Deploy, this.runDeploy.bind(this)],
    ]);
  }

  async run(): Promise<StageResult[]> {
    for (const stage of this.config.stages) {
      const handler = this.handlers.get(stage);
      if (!handler) {
        this.results.push({
          stage,
          status: StageStatus.Skipped,
          durationMs: 0,
          output: "No handler registered",
          artifacts: [],
        });
        continue;
      }
      const result = await handler();
      this.results.push(result);
      if (result.status === StageStatus.Failed && this.config.failFast) {
        break;
      }
    }
    return this.results;
  }

  private async executeCommand(cmd: string, args: string[]): Promise<{
    exitCode: number;
    stdout: string;
    stderr: string;
  }> {
    const { spawn } = await import("child_process");
    return new Promise((resolve) => {
      const proc = spawn(cmd, args, {
        cwd: this.config.workingDir,
        env: { ...process.env, ...this.config.envVars },
      });
      let stdout = "";
      let stderr = "";
      proc.stdout.on("data", (data: Buffer) => { stdout += data.toString(); });
      proc.stderr.on("data", (data: Buffer) => { stderr += data.toString(); });
      proc.on("close", (code: number | null) => {
        resolve({ exitCode: code ?? 1, stdout, stderr });
      });
    });
  }

  private async runLint(): Promise<StageResult> {
    const start = Date.now();
    const result = await this.executeCommand("npx", ["eslint", ".", "--ext", ".ts"]);
    return {
      stage: PipelineStage.Lint,
      status: result.exitCode === 0 ? StageStatus.Passed : StageStatus.Failed,
      durationMs: Date.now() - start,
      output: result.stdout,
      error: result.exitCode !== 0 ? result.stderr : undefined,
      artifacts: [],
    };
  }

  private async runTypeCheck(): Promise<StageResult> {
    const start = Date.now();
    const result = await this.executeCommand("npx", ["tsc", "--noEmit"]);
    return {
      stage: PipelineStage.TypeCheck,
      status: result.exitCode === 0 ? StageStatus.Passed : StageStatus.Failed,
      durationMs: Date.now() - start,
      output: result.stdout,
      error: result.exitCode !== 0 ? result.stderr : undefined,
      artifacts: [],
    };
  }

  private async runUnitTest(): Promise<StageResult> {
    const start = Date.now();
    const result = await this.executeCommand("npx", ["jest", "--coverage", "--verbose"]);
    return {
      stage: PipelineStage.UnitTest,
      status: result.exitCode === 0 ? StageStatus.Passed : StageStatus.Failed,
      durationMs: Date.now() - start,
      output: result.stdout,
      error: result.exitCode !== 0 ? result.stderr : undefined,
      artifacts: ["coverage/lcov.info"],
    };
  }

  private async runIntegrationTest(): Promise<StageResult> {
    const start = Date.now();
    const result = await this.executeCommand("npx", [
      "jest", "--config", "jest.integration.config.ts", "--verbose",
    ]);
    return {
      stage: PipelineStage.IntegrationTest,
      status: result.exitCode === 0 ? StageStatus.Passed : StageStatus.Failed,
      durationMs: Date.now() - start,
      output: result.stdout,
      error: result.exitCode !== 0 ? result.stderr : undefined,
      artifacts: [],
    };
  }

  private async runBuild(): Promise<StageResult> {
    const start = Date.now();
    const result = await this.executeCommand("npx", ["tsc", "--build"]);
    return {
      stage: PipelineStage.Build,
      status: result.exitCode === 0 ? StageStatus.Passed : StageStatus.Failed,
      durationMs: Date.now() - start,
      output: result.stdout,
      error: result.exitCode !== 0 ? result.stderr : undefined,
      artifacts: result.exitCode === 0 ? ["dist/"] : [],
    };
  }

  private async runDeploy(): Promise<StageResult> {
    return {
      stage: PipelineStage.Deploy,
      status: StageStatus.Skipped,
      durationMs: 0,
      output: "Deploy stage requires manual trigger",
      artifacts: [],
    };
  }

  generateReport(): PipelineReport {
    const passed = this.results.filter((r) => r.status === StageStatus.Passed).length;
    const failed = this.results.filter((r) => r.status === StageStatus.Failed).length;
    return {
      totalStages: this.results.length,
      passed,
      failed,
      skipped: this.results.length - passed - failed,
      totalDurationMs: this.results.reduce((sum, r) => sum + r.durationMs, 0),
      success: failed === 0,
      stages: this.results.map((r) => ({
        name: r.stage,
        status: r.status,
        durationMs: r.durationMs,
        artifacts: r.artifacts,
      })),
    };
  }
}
