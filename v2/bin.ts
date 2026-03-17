import { Hono } from "hono";
import { logger } from "hono/logger";
import { serveStatic } from "hono/deno";
import { dirname, fromFileUrl, join } from "@std/path";
import { log } from "./singletons/logger.ts";
import { bootCacheSync, initServices } from "./singletons/services.ts";
import { subscribe } from "./singletons/event-bus.ts";
import { api } from "./api/mod.ts";
import { views } from "./views/mod.ts";
import { APP_NAME, APP_VERSION, DEFAULT_PORT } from "./constants/mod.ts";
import type { AppVariables } from "./types/app.ts";

const __dirname = dirname(fromFileUrl(import.meta.url));

const projectDir = Deno.args[0] ?? Deno.env.get("PROJECT_DIR") ?? "./example";
const port = parseInt(Deno.env.get("PORT") ?? String(DEFAULT_PORT), 10);
const cache = Deno.env.get("CACHE") !== "false";

initServices(projectDir, { cache });
await bootCacheSync();

const app = new Hono<{ Variables: AppVariables }>();

app.use("*", logger((msg: string) => log.info(msg)));

// Per-request nonce for CSP — covers the inline dark-mode script in MainLayout.
app.use("*", async (c, next) => {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  const nonce = btoa(String.fromCharCode(...bytes));
  c.set("nonce", nonce);
  await next();
  c.header(
    "Content-Security-Policy",
    `default-src 'self'; ` +
      `script-src 'nonce-${nonce}' 'self'; ` +
      `style-src 'nonce-${nonce}' 'self' https://fonts.googleapis.com; ` +
      `font-src https://fonts.gstatic.com`,
  );
});

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

app.route("/api", api);
app.route("/", views);

const staticRoot = join(__dirname, "static");
app.use("/css/*", serveStatic({ root: staticRoot }));
app.use("/js/*", serveStatic({ root: staticRoot }));

log.info(`${APP_NAME} v${APP_VERSION}`);
log.info(`Project: ${projectDir}`);
log.info(`Server  http://localhost:${port}`);

Deno.serve({ port }, app.fetch);
