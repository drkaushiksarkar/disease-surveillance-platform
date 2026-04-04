/**
 * Domain-specific error hierarchy for health intelligence services.
 * Provides structured error types with error codes and retry classification.
 */

export class BaseError extends Error {
  constructor(
    message: string,
    public readonly code: string = "UNKNOWN",
    public readonly context: Record<string, unknown> = {},
    public readonly retryable: boolean = false,
  ) {
    super(message);
    this.name = this.constructor.name;
  }

  toJSON(): Record<string, unknown> {
    return { error: this.code, message: this.message, context: this.context, retryable: this.retryable };
  }
}

export class DataError extends BaseError {}
export class ValidationError extends DataError {
  constructor(field: string, message: string, value?: unknown) {
    super(`Validation failed for ${field}: ${message}`, "VALIDATION_ERROR", { field, value: String(value)?.slice(0, 200) });
  }
}

export class SchemaError extends DataError {
  constructor(expected: string, actual: string) {
    super(`Schema mismatch: expected ${expected}, got ${actual}`, "SCHEMA_ERROR", { expected, actual });
  }
}

export class SourceUnavailableError extends DataError {
  constructor(source: string, reason = "") {
    super(`Source unavailable: ${source}${reason ? ` (${reason})` : ""}`, "SOURCE_UNAVAILABLE", { source }, true);
  }
}

export class PipelineError extends BaseError {}
export class StageError extends PipelineError {
  constructor(stage: string, message: string) {
    super(`Stage '${stage}' failed: ${message}`, "STAGE_ERROR", { stage });
  }
}

export class InferenceError extends BaseError {
  constructor(modelId: string, message: string) {
    super(`Inference failed for ${modelId}: ${message}`, "INFERENCE_ERROR", { modelId }, true);
  }
}
