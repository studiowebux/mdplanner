/**
 * MCP HTTP transport handler for remote access.
 * Mounts an MCP-over-HTTP endpoint on the existing Hono server.
 * Pattern: Factory Method
 *
 * Uses WebStandardStreamableHTTPServerTransport (MCP SDK v1.26.0), the
 * public web-standard API designed for Deno/Hono/Cloudflare Workers.
 * One transport instance is created per client session.
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
 * Stateful mode: one transport + server per session, tracked by session ID.
 * Requests without a session ID start a new session (initialize flow).
 *
 * @param pm    ProjectManager instance (shared with REST API)
 * @param token Optional bearer token. When set, requests without a matching
 *              Authorization header receive 401.
 */
export function createMcpHonoRouter(
  pm: ProjectManager,
  token?: string,
): Hono {
  // Session registry: session ID → transport (Pattern: Registry)
  const sessions = new Map<string, WebStandardStreamableHTTPServerTransport>();

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

  // MCP endpoint — handles POST (tool calls), GET (SSE stream), DELETE (close).
  // Route pattern "*" matches both "/mcp" (empty suffix) and "/mcp/" (slash suffix).
  router.all("*", async (c) => {
    const sessionId = c.req.header("mcp-session-id");

    let transport = sessionId ? sessions.get(sessionId) : undefined;

    if (!transport) {
      // New session: create transport + server pair.
      transport = new WebStandardStreamableHTTPServerTransport({
        sessionIdGenerator: () => crypto.randomUUID(),
        onsessioninitialized: (id) => {
          sessions.set(id, transport!);
        },
        onsessionclosed: (id) => {
          sessions.delete(id);
        },
      });

      const server = createMcpServer(pm);
      await server.connect(transport);
    }

    return transport.handleRequest(c.req.raw);
  });

  return router;
}
