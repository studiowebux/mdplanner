// MCP HTTP transport — Hono router for remote MCP access.
// Stateless mode: fresh transport + server per request. No session tracking.
// Pattern: Factory Method

import { Hono } from "hono";
import { cors } from "hono/cors";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { createMcpServer } from "./server.ts";

export interface McpHttpOptions {
  token?: string;
  readOnly?: boolean;
}

export function createMcpHonoRouter(options?: McpHttpOptions): Hono {
  const router = new Hono();

  router.use("*", cors());

  if (options?.token) {
    const expected = `Bearer ${options.token}`;
    router.use("*", async (c, next) => {
      if (c.req.header("Authorization") !== expected) {
        return c.json({ error: "UNAUTHORIZED", message: "Invalid or missing token" }, 401);
      }
      await next();
    });
  }

  if (options?.readOnly) {
    router.post("*", (c) =>
      c.json(
        { error: "READ_ONLY_MODE", message: "Server is in read-only mode" },
        405,
      )
    );
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
