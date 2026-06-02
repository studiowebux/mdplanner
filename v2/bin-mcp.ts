// MCP stdio entry point — Claude Desktop / CLI transport.
// Boots the same v2 services as bin.ts, then connects the MCP server over
// stdio instead of HTTP. IMPORTANT: the stdio transport frames the MCP
// protocol on stdout, so nothing here may write to stdout (logs go to stderr
// via the minilog singleton).

import { bootCacheSync, initServices } from "./singletons/services.ts";
import { startMcpServer } from "./mcp/mod.ts";

const projectDir = Deno.args[0] ?? Deno.env.get("PROJECT_DIR") ?? "./example";
const cache = Deno.env.get("CACHE") === "true";

initServices(projectDir, { cache });
if (cache) await bootCacheSync();
await startMcpServer();
