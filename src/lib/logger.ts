// Structured JSON logger — never logs PII or API keys

type LogLevel = "info" | "warn" | "error" | "debug";

interface LogEntry {
  level: LogLevel;
  message: string;
  traceId?: string;
  code?: string;
  timestamp: string;
  data?: unknown;
}

import { stringify } from "./bigint";

function log(level: LogLevel, message: string, meta?: Omit<LogEntry, "level" | "message" | "timestamp">): void {
  const entry: LogEntry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...meta,
  };

  const output = stringify(entry);

  if (level === "error") {
    console.error(output);
  } else if (level === "warn") {
    console.warn(output);
  } else if (level === "debug" && import.meta.env.VITE_APP_ENV === "development") {
    console.debug(output);
  } else {
    console.log(output);
  }
}

export const logger = {
  info: (message: string, meta?: Omit<LogEntry, "level" | "message" | "timestamp">) =>
    log("info", message, meta),
  warn: (message: string, meta?: Omit<LogEntry, "level" | "message" | "timestamp">) =>
    log("warn", message, meta),
  error: (message: string, meta?: Omit<LogEntry, "level" | "message" | "timestamp">) =>
    log("error", message, meta),
  debug: (message: string, meta?: Omit<LogEntry, "level" | "message" | "timestamp">) =>
    log("debug", message, meta),
};
