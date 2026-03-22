import { Hono } from "hono";
import { logger } from "hono/logger";
import { serveStatic } from "hono/deno";
import { dirname, fromFileUrl, join } from "@std/path";
import { log } from "./singletons/logger.ts";
import { bootCacheSync, initServices } from "./singletons/services.ts";
import { subscribe } from "./singletons/event-bus.ts";
import { api } from "./api/mod.ts";
import { views } from "./views/mod.ts";
import { createMcpHonoRouter } from "./mcp/mod.ts";
import { contextMiddleware } from "./middleware/context.ts";
import {
  APP_NAME,
  APP_VERSION,
  DEFAULT_PORT,
  setSectionOrder,
} from "./constants/mod.ts";
import { getProjectService } from "./singletons/services.ts";
import { setFormatConfig } from "./utils/format.ts";
import { setTimeLocale } from "./utils/time.ts";
import type { AppVariables } from "./types/app.ts";

const __dirname = dirname(fromFileUrl(import.meta.url));

const projectDir = Deno.args[0] ?? Deno.env.get("PROJECT_DIR") ?? "./example";
const cache = Deno.env.get("CACHE") !== "false";

initServices(projectDir, { cache });
await bootCacheSync();

const projectConfig = await getProjectService().getConfig();
const envPort = Deno.env.get("PORT");
const port = envPort
  ? parseInt(envPort, 10)
  : (projectConfig.port ?? DEFAULT_PORT);

setFormatConfig({
  locale: projectConfig.locale,
  currency: projectConfig.currency,
});
if (projectConfig.locale) setTimeLocale(projectConfig.locale);
if (projectConfig.sectionOrder?.length) {
  setSectionOrder(projectConfig.sectionOrder);
}

const app = new Hono<{ Variables: AppVariables }>();

app.use("*", logger((msg: string) => log.info(msg)));

app.use("*", contextMiddleware);

// SSE — domain-agnostic broadcast stream. Named events only, no payload.
app.get("/sse", () => {
  const stream = subscribe().pipeThrough(new TextEncoderStream());
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
});

const mcpToken = Deno.env.get("MCP_TOKEN");
app.route("/mcp", createMcpHonoRouter({ token: mcpToken }));
app.route("/api", api);
app.route("/", views);

const staticRoot = join(__dirname, "static");
app.use("/css/*", serveStatic({ root: staticRoot }));
app.use("/js/*", serveStatic({ root: staticRoot }));

log.info(`${APP_NAME} v${APP_VERSION}`);
log.info(`Project: ${projectDir}`);
log.info(`Server  http://localhost:${port}`);

Deno.serve({ port }, app.fetch);
