/**
 * WebDAV structured logger — a self-contained logger with a configurable
 * json/text format + ANSI levels + [WebDAV] prefix. Intentionally NOT routed
 * through the app `log` singleton, which is text-only and would drop the JSON
 * request-log mode.
 */

import type { Logger, LogLevel } from "./types.ts";

export function createLogger(logFormat: "json" | "pretty"): Logger {
  return function log(
    level: LogLevel,
    msg: string,
    extra?: Record<string, unknown>,
  ): void {
    const ts = new Date().toISOString();
    if (logFormat === "json") {
      console.log(JSON.stringify({ ts, level, msg, ...extra }));
    } else {
      const colors: Record<LogLevel, string> = {
        INFO: "\x1b[32m",
        WARN: "\x1b[33m",
        ERROR: "\x1b[31m",
        DEBUG: "\x1b[36m",
      };
      const extras = extra ? " " + JSON.stringify(extra) : "";
      console.log(
        `[WebDAV] ${colors[level]}[${level}]\x1b[0m ${ts} ${msg}${extras}`,
      );
    }
  };
}
