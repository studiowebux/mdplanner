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
import { runShutdown } from "./utils/shutdown.ts";
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
// Brief pause after the shutdown notice so the event flushes to sockets.
const SHUTDOWN_FLUSH_MS = 150;
// Max time to wait for the graceful drain before forcing exit. Long-lived
// `/sse` + MCP keep-alive connections would otherwise hang it forever.
const SHUTDOWN_DRAIN_MS = 1000;
let shuttingDown = false;
const shutdown = (signal: string): Promise<void> => {
  if (shuttingDown) return Promise.resolve();
  shuttingDown = true;
  log.info(`Received ${signal} — shutting down`);
  return runShutdown({
    notify: () => publish("server.shutdown"),
    flushMs: SHUTDOWN_FLUSH_MS,
    closeStreams: closeAll,
    drain: () => server.shutdown(),
    drainMs: SHUTDOWN_DRAIN_MS,
    exit: Deno.exit,
    log: (msg) => log.warn(msg),
  });
};
for (const sig of ["SIGINT", "SIGTERM"] as const) {
  try {
    Deno.addSignalListener(sig, () => void shutdown(sig));
  } catch (err) {
    log.warn(`[shutdown] ${sig} listener not available:`, err);
  }
}
