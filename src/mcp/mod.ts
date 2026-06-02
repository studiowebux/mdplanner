// MCP server — public API.
// server.ts: factory + stdio transport
// http.ts: Hono router for HTTP transport
// tools/: one file per domain, thin wrappers over v2 services

export { createMcpServer, startMcpServer } from "./server.ts";
export { createMcpHonoRouter } from "./http.ts";
export type { McpHttpOptions } from "./http.ts";
