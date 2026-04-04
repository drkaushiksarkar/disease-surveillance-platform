export enum StageStatus { Pending = "pending", Running = "running", Completed = "completed", Failed = "failed" }

export interface StageResult {
  name: string; status: StageStatus; recordsIn: number; recordsOut: number;
  elapsedMs: number; error?: string;
}

export interface PipelineResult { pipelineId: string; stages: StageResult[]; success: boolean; totalMs: number; }

type TransformFn<T> = (data: T) => T;

export class Pipeline<T = unknown[]> {
  private stages: { name: string; transform: TransformFn<T>; validate?: (data: T) => boolean }[] = [];

  constructor(private pipelineId: string) {}

  addStage(name: string, transform: TransformFn<T>, validate?: (data: T) => boolean): this {
    this.stages.push({ name, transform, validate });
    return this;
  }

  execute(data: T): PipelineResult {
    const start = Date.now();
    const results: StageResult[] = [];
    let current = data;

    for (const stage of this.stages) {
      const stageStart = Date.now();
      try {
        const input = Array.isArray(current) ? current.length : 0;
        current = stage.transform(current);
        const output = Array.isArray(current) ? current.length : 0;
        if (stage.validate && !stage.validate(current)) {
          results.push({ name: stage.name, status: StageStatus.Failed, recordsIn: input, recordsOut: output, elapsedMs: Date.now() - stageStart, error: "Validation failed" });
          break;
        }
        results.push({ name: stage.name, status: StageStatus.Completed, recordsIn: input, recordsOut: output, elapsedMs: Date.now() - stageStart });
      } catch (e) {
        results.push({ name: stage.name, status: StageStatus.Failed, recordsIn: 0, recordsOut: 0, elapsedMs: Date.now() - stageStart, error: String(e) });
        break;
      }
    }

    return {
      pipelineId: this.pipelineId, stages: results,
      success: results.every((s) => s.status === StageStatus.Completed),
      totalMs: Date.now() - start,
    };
  }
}
