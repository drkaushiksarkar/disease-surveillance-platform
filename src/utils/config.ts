/**
 * Application configuration with environment variable support.
 * Provides typed configuration loading with validation and defaults.
 */

export interface DatabaseConfig {
  host: string;
  port: number;
  name: string;
  user: string;
  password: string;
  poolSize: number;
  sslMode: string;
}

export interface S3Config {
  bucket: string;
  region: string;
  prefix: string;
}

export interface CacheConfig {
  memorySize: number;
  memoryTtl: number;
  enabled: boolean;
}

export interface AppConfig {
  env: string;
  debug: boolean;
  logLevel: string;
  serviceName: string;
  database: DatabaseConfig;
  s3: S3Config;
  cache: CacheConfig;
}

function envStr(key: string, fallback: string): string {
  return process.env[key] || fallback;
}

function envInt(key: string, fallback: number): number {
  const v = process.env[key];
  return v ? parseInt(v, 10) : fallback;
}

function envBool(key: string, fallback: boolean): boolean {
  const v = process.env[key]?.toLowerCase();
  if (v === "true" || v === "1") return true;
  if (v === "false" || v === "0") return false;
  return fallback;
}

export function loadConfig(): AppConfig {
  return {
    env: envStr("APP_ENV", "production"),
    debug: envBool("APP_DEBUG", false),
    logLevel: envStr("LOG_LEVEL", "INFO"),
    serviceName: envStr("SERVICE_NAME", "health-intelligence"),
    database: {
      host: envStr("DB_HOST", "localhost"),
      port: envInt("DB_PORT", 5432),
      name: envStr("DB_NAME", "health_intelligence"),
      user: envStr("DB_USER", "app"),
      password: envStr("DB_PASSWORD", ""),
      poolSize: envInt("DB_POOL_SIZE", 10),
      sslMode: envStr("DB_SSL_MODE", "require"),
    },
    s3: {
      bucket: envStr("S3_BUCKET", "imacs-mm-foundation-data-prod"),
      region: envStr("AWS_REGION", "us-east-1"),
      prefix: envStr("S3_PREFIX", ""),
    },
    cache: {
      memorySize: envInt("CACHE_MEMORY_SIZE", 1024),
      memoryTtl: envInt("CACHE_MEMORY_TTL", 600000),
      enabled: envBool("CACHE_ENABLED", true),
    },
  };
}
