/**
 * MCP HTTP transport handler for remote access.
 * Mounts an MCP-over-HTTP endpoint on the existing Hono server.
 * Pattern: Factory Method
 *
 * Uses WebStandardStreamableHTTPServerTransport in stateless mode (MCP SDK
 * v1.26.0). Each request gets a fresh transport + server instance. No session
 * tracking — avoids stale-session failures when the dev server restarts and
 * the client holds a cached session ID it can no longer invalidate.
 */

import { Hono } from "hono";
import { cors } from "hono/cors";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { ProjectManager } from "../lib/project-manager.ts";
import { createMcpServer } from "./server.ts";

/**
 * Create a Hono router that serves the MCP HTTP endpoint.
 * Mount it at "/mcp" in the main Hono app.
 *
 * Stateless mode: one transport + server per request. No session registry.
 * Resilient to server restarts — the client never holds stale session state.
 *
 * @param pm    ProjectManager instance (shared with REST API)
 * @param token Optional bearer token. When set, requests without a matching
 *              Authorization header receive 401.
 */
export function createMcpHonoRouter(
  pm: ProjectManager,
  token?: string,
): Hono {
  const router = new Hono();

  // CORS: allow any origin so remote MCP clients can connect.
  router.use("*", cors());

  // Optional bearer token auth.
  if (token) {
    router.use("*", async (c, next) => {
      const auth = c.req.header("Authorization");
      if (auth !== `Bearer ${token}`) {
        return c.json({ error: "Unauthorized" }, 401);
      }
      await next();
    });
  }

  // MCP endpoint — handles POST (tool calls), GET (SSE), DELETE (close).
  // Stateless: fresh transport + server per request. sessionIdGenerator:
  // undefined disables session tracking in the SDK.
  router.all("*", async (c) => {
    const transport = new WebStandardStreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });

    const server = createMcpServer(pm);
    await server.connect(transport);

    return transport.handleRequest(c.req.raw);
  });

  return router;
}
