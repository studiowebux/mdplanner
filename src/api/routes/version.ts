/**
 * Version and update checking routes.
 */

import { Hono } from "hono";
import { AppVariables, isReadOnly, jsonResponse } from "./context.ts";
import { GITHUB_REPO, VERSION } from "../../lib/version.ts";

export const versionRouter = new Hono<{ Variables: AppVariables }>();

// GET /version - get current version and check for updates
versionRouter.get("/", async (c) => {
  let latestVersion = null;
  let updateAvailable = false;

  try {
    const response = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`,
      { headers: { Accept: "application/vnd.github.v3+json" } },
    );
    if (response.ok) {
      const data = await response.json();
      latestVersion = data.tag_name?.replace(/^v/, "") || null;
      if (latestVersion && latestVersion !== VERSION) {
        const current = VERSION.split(".").map(Number);
        const latest = latestVersion.split(".").map(Number);
        for (let i = 0; i < 3; i++) {
          if ((latest[i] || 0) > (current[i] || 0)) {
            updateAvailable = true;
            break;
          } else if ((latest[i] || 0) < (current[i] || 0)) {
            break;
          }
        }
      }
    }
  } catch {
    // Ignore fetch errors - just return current version
  }

  return jsonResponse({
    current: VERSION,
    latest: latestVersion,
    updateAvailable,
    repo: GITHUB_REPO,
    readOnly: isReadOnly(c),
  });
});
