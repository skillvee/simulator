type LogLevel = "debug" | "info" | "warn" | "error";

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const COLORS: Record<LogLevel, string> = {
  debug: "\x1b[36m", // cyan
  info: "\x1b[32m",  // green
  warn: "\x1b[33m",  // yellow
  error: "\x1b[31m", // red
};

const RESET = "\x1b[0m";

function getLogLevel(): LogLevel {
  const env = process.env.LOG_LEVEL?.toLowerCase().trim();
  if (env && env in LOG_LEVELS) return env as LogLevel;
  return "info";
}

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[getLogLevel()];
}

export interface Logger {
  debug: (message: string, data?: Record<string, unknown>) => void;
  info: (message: string, data?: Record<string, unknown>) => void;
  warn: (message: string, data?: Record<string, unknown>) => void;
  error: (message: string, data?: Record<string, unknown>) => void;
}

/**
 * Client-safe check for whether screen recording should be skipped.
 * Uses process.env directly (not the validated env object) so it can be
 * imported by client components without pulling in server-only env.ts.
 */
export function shouldSkipScreenRecording(): boolean {
  return (
    process.env.NODE_ENV === "development" &&
    (process.env.NEXT_PUBLIC_SKIP_SCREEN_RECORDING === "true" ||
      process.env.NEXT_PUBLIC_E2E_TEST_MODE === "true")
  );
}

export function createLogger(module: string): Logger {
  const isProduction = process.env.NODE_ENV === "production";

  function log(
    level: LogLevel,
    message: string,
    data?: Record<string, unknown>
  ): void {
    if (!shouldLog(level)) return;

    if (isProduction) {
      const entry = {
        level,
        module,
        message,
        timestamp: new Date().toISOString(),
        ...data,
      };
      const consoleFn = level === "error" ? console.error : level === "warn" ? console.warn : console.log;
      consoleFn(JSON.stringify(entry));
    } else {
      const color = COLORS[level];
      const prefix = `${color}[${level.toUpperCase()}]${RESET} [${module}]`;
      const consoleFn = level === "error" ? console.error : level === "warn" ? console.warn : level === "debug" ? console.debug : console.info;
      if (data && Object.keys(data).length > 0) {
        consoleFn(prefix, message, data);
      } else {
        consoleFn(prefix, message);
      }
    }
  }

  return {
    debug: (message, data?) => log("debug", message, data),
    info: (message, data?) => log("info", message, data),
    warn: (message, data?) => log("warn", message, data),
    error: (message, data?) => log("error", message, data),
  };
}
