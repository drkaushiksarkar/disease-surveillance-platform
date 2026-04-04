/**
 * Structured logging for production services.
 * Provides JSON-formatted output with correlation IDs.
 */

import { randomUUID } from "crypto";

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  service: string;
  correlationId?: string;
  [key: string]: unknown;
}

let currentCorrelationId = "";

export function setCorrelationId(id?: string): string {
  currentCorrelationId = id || randomUUID().slice(0, 12);
  return currentCorrelationId;
}

export class Logger {
  private minLevel: LogLevel;

  constructor(
    private name: string,
    private service: string = "health-intelligence",
    level: LogLevel = LogLevel.INFO,
  ) {
    this.minLevel = level;
  }

  private log(level: LogLevel, levelName: string, message: string, extra?: Record<string, unknown>): void {
    if (level < this.minLevel) return;
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: levelName,
      message,
      service: this.service,
      logger: this.name,
      ...extra,
    };
    if (currentCorrelationId) entry.correlationId = currentCorrelationId;
    process.stdout.write(JSON.stringify(entry) + "\n");
  }

  debug(msg: string, extra?: Record<string, unknown>): void { this.log(LogLevel.DEBUG, "DEBUG", msg, extra); }
  info(msg: string, extra?: Record<string, unknown>): void { this.log(LogLevel.INFO, "INFO", msg, extra); }
  warn(msg: string, extra?: Record<string, unknown>): void { this.log(LogLevel.WARN, "WARN", msg, extra); }
  error(msg: string, extra?: Record<string, unknown>): void { this.log(LogLevel.ERROR, "ERROR", msg, extra); }
}

export function getLogger(name: string): Logger {
  return new Logger(name);
}
