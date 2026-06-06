// MCP HTTP transport — Hono router for remote MCP access.
// Stateless mode: fresh transport + server per request. No session tracking.
// Pattern: Factory Method

import { Hono } from "hono";
import { cors } from "hono/cors";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { createMcpServer } from "./server.ts";
import { resolveActorFromApiKey } from "../middleware/identity.ts";
import { getProjectService } from "../singletons/services.ts";
import { methodNotAllowed, unauthorized } from "../types/api.ts";
import type { AppVariables } from "../types/app.ts";

export interface McpHttpOptions {
  token?: string;
  readOnly?: boolean;
}

/** Extract a Bearer token from an Authorization header, if present. */
function bearerToken(authHeader: string | undefined): string | undefined {
  return authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;
}

export function createMcpHonoRouter(options?: McpHttpOptions): Hono<{
  Variables: AppVariables;
}> {
  const router = new Hono<{ Variables: AppVariables }>();

  router.use("*", cors());

  // Auth + identity. The MCP endpoint accepts two credentials:
  //   1. The shared MCP_TOKEN (options.token) via `Authorization: Bearer`.
  //   2. A named project API key (project.md api_keys) via `X-Api-Key` OR
  //      `Authorization: Bearer` — the matched key's name becomes the actor,
  //      so an MCP connection can identify itself (e.g. "Claude").
  // When neither a token nor any api_keys are configured the endpoint is open,
  // preserving the prior token-less behaviour.
  router.use("*", async (c, next) => {
    const apiKeys = (await getProjectService().getConfig()).apiKeys ?? [];
    const authConfigured = Boolean(options?.token) || apiKeys.length > 0;
    if (!authConfigured) return await next();

    const bearer = bearerToken(c.req.header("Authorization"));

    // Shared MCP_TOKEN — grants access without a named identity.
    if (options?.token && bearer === options.token) return await next();

    // Named identity — api key sent as X-Api-Key or Bearer.
    const candidate = c.req.header("X-Api-Key") ?? bearer;
    if (candidate) {
      const actor = resolveActorFromApiKey(candidate, apiKeys);
      if (actor) {
        c.set("actor", actor);
        return await next();
      }
    }

    return c.json(unauthorized("Invalid or missing token"), 401);
  });

  if (options?.readOnly) {
    router.post("*", (c) =>
      c.json(
        methodNotAllowed("Server is in read-only mode", {
          error: "READ_ONLY_MODE",
        }),
        405,
      ));
  }

  router.all("*", async (c) => {
    const transport = new WebStandardStreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });
    const server = createMcpServer();
    await server.connect(transport);
    return transport.handleRequest(c.req.raw);
  });

  return router;
}
