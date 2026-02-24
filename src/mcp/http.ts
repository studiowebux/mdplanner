/**
 * MCP HTTP transport handler for remote access.
 * Mounts an MCP-over-HTTP endpoint on the existing Hono server.
 * Pattern: Factory Method
 *
 * Uses StreamableHTTPServerTransport (MCP SDK v1.26.0) in stateful mode.
 * The inner _webStandardTransport is used directly to handle Hono/Deno
 * web-standard Request objects without a Node.js compatibility layer.
 */

import { Hono } from "hono";
import { cors } from "hono/cors";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { ProjectManager } from "../lib/project-manager.ts";
import { createMcpServer } from "./server.ts";

/**
 * Create a Hono router that serves the MCP HTTP endpoint at "/".
 * Mount it at "/mcp" in the main Hono app.
 *
 * @param pm    ProjectManager instance (shared with REST API)
 * @param token Optional bearer token. When set, requests without a matching
 *              Authorization header receive 401.
 */
export async function createMcpHonoRouter(
  pm: ProjectManager,
  token?: string,
): Promise<Hono> {
  // Stateful transport: sessions tracked in memory, transport is reused across
  // requests. One session = one MCP client connection.
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => crypto.randomUUID(),
  });

  const server = createMcpServer(pm);
  await server.connect(transport);

  const router = new Hono();

  // CORS: allow any origin so browser-based MCP clients can connect.
  router.use("/*", cors());

  // Optional bearer token auth.
  if (token) {
    router.use("/*", async (c, next) => {
      const auth = c.req.header("Authorization");
      if (auth !== `Bearer ${token}`) {
        return c.json({ error: "Unauthorized" }, 401);
      }
      await next();
    });
  }

  // MCP endpoint — handles POST (tool calls) and GET (SSE stream).
  // _webStandardTransport accepts a web-standard Request and returns a Response,
  // which is the native contract for Hono handlers in Deno. (SDK v1.26.0)
  router.all("/", async (c) => {
    // deno-lint-ignore no-explicit-any
    const inner = (transport as any)._webStandardTransport;
    return await inner.handleRequest(c.req.raw, {}) as Response;
  });

  return router;
}
