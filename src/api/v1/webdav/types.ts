/**
 * WebDAV shared types — public config, resolved config, and logger contract.
 * Kept separate so sibling modules (handler, methods, log) avoid import cycles.
 */

export interface WebDavConfig {
  rootDir: string;
  authUser?: string | null;
  authPass?: string | null;
  logFormat?: "json" | "pretty";
  lockTimeout?: number; // seconds, default 3600
  maxUploadBytes?: number; // 0 = unlimited
  maxDepth?: number; // default 20
  trashDir?: string; // default rootDir/.trash
  stateDir?: string; // default rootDir/.state
  /** URL prefix under which the handler is mounted (e.g. "/webdav").
   *  Stripped from request paths before filesystem resolution so that
   *  PROPFIND hrefs and Destination headers all resolve correctly. */
  pathPrefix?: string;
}

/** Config after defaults are applied and paths resolved (handler-internal). */
export interface ResolvedWebDavConfig {
  rootDir: string;
  authUser: string | null;
  authPass: string | null;
  logFormat: "json" | "pretty";
  lockTimeout: number;
  maxUploadBytes: number;
  maxDepth: number;
  trashDir: string;
  stateDir: string;
  pathPrefix: string;
}

export type LogLevel = "INFO" | "WARN" | "ERROR" | "DEBUG";

export type Logger = (
  level: LogLevel,
  msg: string,
  extra?: Record<string, unknown>,
) => void;
