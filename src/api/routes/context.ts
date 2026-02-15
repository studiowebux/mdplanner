/**
 * Shared context and types for API routes.
 */

import { Context } from "hono";
import { ProjectManager } from "../../lib/project-manager.ts";
import { Parser } from "../../lib/parser-interface.ts";

export interface AppVariables {
  projectManager: ProjectManager;
}

export type AppContext = Context<{ Variables: AppVariables }>;

export function getParser(c: AppContext): Parser {
  return c.get("projectManager").getActiveParser();
}

export function getProjectManager(c: AppContext): ProjectManager {
  return c.get("projectManager");
}

export const corsHeaders = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: corsHeaders,
  });
}

export function errorResponse(message: string, status = 500): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: corsHeaders,
  });
}
