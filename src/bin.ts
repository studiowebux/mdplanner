import { Hono } from "hono";
import { logger } from "hono/logger";
import { requestId } from "hono/request-id";
import { serveStatic } from "hono/deno";
import { dirname, fromFileUrl, join } from "@std/path";
import { log } from "./singletons/logger.ts";
import { bootCacheSync, initServices } from "./singletons/services.ts";
import { closeAll, publish, subscribe } from "./singletons/event-bus.ts";
import { api } from "./api/mod.ts";
import { views } from "./views/mod.tsx";
import { createMcpHonoRouter } from "./mcp/mod.ts";
import { registerWebDav } from "./api/v1/webdav/routes.ts";
import { contextMiddleware } from "./middleware/context.ts";
import { identityGuard } from "./middleware/identity-guard.ts";
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
import { errorHandler, notFoundHandler } from "./middleware/error-handlers.tsx";

const __dirname = dirname(fromFileUrl(import.meta.url));

const projectDir = Deno.args[0] ?? Deno.env.get("PROJECT_DIR") ?? "./example";
const cache = Deno.env.get("CACHE") !== "false";

// Warn when projectDir is the relative default and was not explicitly provided.
// In production containers this points into the image layer — data is lost on restart.
if (!Deno.args[0] && !Deno.env.get("PROJECT_DIR")) {
  log.warn(
    "[WARN] PROJECT_DIR is not set and no CLI argument was given. " +
      'Using "./example" as the data directory. ' +
      "Data written here will be lost on container restart. " +
      "Set PROJECT_DIR=/data (or pass the path as a CLI argument) in production.",
  );
}

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

app.use("*", requestId());
app.use("*", logger((msg: string) => log.info(msg)));

app.use("*", contextMiddleware);
app.use("*", identityGuard);

app.notFound(notFoundHandler);

app.onError(errorHandler);

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

await registerWebDav(app, projectDir);

app.route("/", views);

const staticRoot = join(__dirname, "static");
// 1-hour browser cache for immutable static assets (CSS/JS).
// Bump asset filenames (or add ?v=) when breaking changes are needed.
app.use("/css/*", async (c, next) => {
  await next();
  c.header("Cache-Control", "public, max-age=3600");
});
app.use("/js/*", async (c, next) => {
  await next();
  c.header("Cache-Control", "public, max-age=3600");
});
app.use("/css/*", serveStatic({ root: staticRoot }));
app.use("/js/*", serveStatic({ root: staticRoot }));

// Browsers auto-request /favicon.ico regardless of <link rel="icon">.
// Serve the SVG bytes with image/svg+xml so the request returns 200 and
// modern clients render the icon without 404 console noise.
const faviconSvg = await Deno.readTextFile(join(staticRoot, "favicon.svg"));
app.get("/favicon.ico", (c) => {
  c.header("Content-Type", "image/svg+xml");
  c.header("Cache-Control", "public, max-age=3600");
  return c.body(faviconSvg);
});
app.use("/favicon*", serveStatic({ root: staticRoot }));

log.info(`${APP_NAME} v${APP_VERSION}`);
log.info(`Project: ${projectDir}`);
log.info(`Server  http://localhost:${port}`);
if (!Deno.env.get("MDPLANNER_SECRET_KEY")) {
  log.warn(
    "MDPLANNER_SECRET_KEY not set — integration tokens stored in plaintext, cookie identity unsecured.",
  );
}

const server = Deno.serve({ port }, app.fetch);

// Graceful shutdown — stop accepting requests, then exit so the port is
// released and the CacheDatabase `unload` handler closes the connection. The
// DB layer no longer registers signal listeners (those suppressed the default
// terminate and left the process lingering → AddrInUse on the next boot).
let shuttingDown = false;
const shutdown = async (signal: string) => {
  if (shuttingDown) return;
  shuttingDown = true;
  log.info(`Received ${signal} — shutting down`);
  try {
    // Tell connected clients we're going down so the UI can show a notice
    // before its SSE stream ends; brief pause lets the event flush to sockets.
    publish("server.shutdown");
    await new Promise((r) => setTimeout(r, 150));
    // End open SSE streams first so the graceful drain below returns promptly.
    closeAll();
    await server.shutdown();
  } catch (err) {
    log.warn("[shutdown] server.shutdown() failed:", err);
  }
  Deno.exit(0);
};
for (const sig of ["SIGINT", "SIGTERM"] as const) {
  try {
    Deno.addSignalListener(sig, () => void shutdown(sig));
  } catch (err) {
    log.warn(`[shutdown] ${sig} listener not available:`, err);
  }
}
