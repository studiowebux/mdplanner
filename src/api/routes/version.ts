/**
 * Version and update checking routes.
 */

import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { AppVariables, isReadOnly } from "./context.ts";
import { GITHUB_REPO, VERSION } from "../../lib/version.ts";

export const versionRouter = new OpenAPIHono<{ Variables: AppVariables }>();

const getVersionRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Core"],
  summary: "Get current version and check for updates",
  operationId: "getVersion",
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.object({
            current: z.string().openapi({ example: "0.25.2" }),
            latest: z.string().nullable().openapi({
              example: "0.25.2",
              description:
                "Latest release version from GitHub, or null if check failed",
            }),
            updateAvailable: z.boolean(),
            repo: z.string().openapi({ example: "studiowebux/mdplanner" }),
            readOnly: z.boolean(),
          }).openapi("VersionResponse"),
        },
      },
      description: "Current version info with update availability",
    },
  },
});

versionRouter.openapi(getVersionRoute, async (c) => {
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

  return c.json({
    current: VERSION,
    latest: latestVersion,
    updateAvailable,
    repo: GITHUB_REPO,
    readOnly: isReadOnly(c),
  }, 200);
});
