// WebDAV mount — env-guarded RFC 4918 Class 1/2/3 server at /webdav/.
//
// Enable by setting:
//   WEBDAV=true
//   WEBDAV_USER=<basic auth username>
//   WEBDAV_PASS=<basic auth password>
//
// Mounts the PROJECT_DIR as a DAV volume (Obsidian remote vaults, macOS Finder,
// Windows Explorer, etc.). Bypasses the v2 repository layer + SQLite FTS cache:
// direct writes mutate files on disk and the cache will lag until next sync.

import type { Hono } from "hono";
import { log } from "../../../singletons/logger.ts";
import { createWebDavHandler } from "./handler.ts";
import type { AppVariables } from "../../../types/app.ts";

const MOUNT = "/webdav";

export async function registerWebDav(
  app: Hono<{ Variables: AppVariables }>,
  projectDir: string,
): Promise<void> {
  if (Deno.env.get("WEBDAV") !== "true") return;

  const authUser = Deno.env.get("WEBDAV_USER") ?? "";
  const authPass = Deno.env.get("WEBDAV_PASS") ?? "";
  if (!authUser || !authPass) {
    throw new Error(
      "WebDAV is enabled (WEBDAV=true) but WEBDAV_USER and WEBDAV_PASS are required.",
    );
  }

  const handler = await createWebDavHandler({
    rootDir: projectDir,
    authUser,
    authPass,
    pathPrefix: MOUNT,
  });

  // Redirect /webdav → /webdav/ so DAV clients hit the root collection.
  app.get(MOUNT, (c) => c.redirect(`${MOUNT}/`, 301));
  app.all(`${MOUNT}/*`, (c) => handler(c.req.raw));

  log.info(`WebDAV http://localhost:<port>${MOUNT}/ (basic auth)`);
}
