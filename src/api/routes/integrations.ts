/**
 * Integration secrets routes.
 * Manages provider credentials stored (optionally encrypted) in project.md.
 *
 * POST   /api/integrations/cloudflare          — save Cloudflare API token
 * GET    /api/integrations/cloudflare           — check if token is configured
 * DELETE /api/integrations/cloudflare           — remove Cloudflare credentials
 * GET    /api/integrations/cloudflare/zones     — preview domains from CF API
 * POST   /api/dns/sync/cloudflare               — upsert all CF registrar domains
 *
 * POST   /api/integrations/github              — save GitHub PAT
 * GET    /api/integrations/github              — check if token is configured
 * DELETE /api/integrations/github              — remove GitHub credentials
 * GET    /api/integrations/github/test         — verify token (calls GET /user)
 */

import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { isEncryptionEnabled } from "../../lib/secrets.ts";
import { CloudflareDnsProvider } from "../../lib/integrations/providers/cloudflare-dns.ts";
import { GitHubApiProvider } from "../../lib/integrations/providers/github.ts";
import { ProjectManager } from "../../lib/project-manager.ts";
import { DirectoryMarkdownParser } from "../../lib/parser/directory/parser.ts";
import { AppVariables, getParser, getProjectManager } from "./context.ts";

export const integrationsRouter = new OpenAPIHono<{
  Variables: AppVariables;
}>();

const ErrorSchema = z.object({
  error: z.string(),
  message: z.string().optional(),
});
const SuccessSchema = z.object({ success: z.boolean() });

// POST /integrations/cloudflare — save token (account ID is auto-fetched later)
const saveCfTokenRoute = createRoute({
  method: "post",
  path: "/cloudflare",
  tags: ["Integrations"],
  summary: "Save Cloudflare API token",
  operationId: "saveCloudflareToken",
  request: {
    body: {
      content: {
        "application/json": {
          schema: z.object({
            token: z.string(),
          }),
        },
      },
      required: true,
    },
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.object({
            success: z.boolean(),
            encrypted: z.boolean(),
          }),
        },
      },
      description: "Token saved",
    },
    400: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Missing token",
    },
  },
});

integrationsRouter.openapi(saveCfTokenRoute, async (c) => {
  const pm = getProjectManager(c);
  const body = c.req.valid("json");
  const token = body.token?.trim();

  if (!token) return c.json({ error: "token is required" }, 400);

  await pm.setIntegrationSecret("cloudflare", "token", token);

  return c.json(
    {
      success: true,
      encrypted: isEncryptionEnabled(),
    },
    200,
  );
});

// GET /integrations/cloudflare — return presence + encryption status (never the token)
const getCfStatusRoute = createRoute({
  method: "get",
  path: "/cloudflare",
  tags: ["Integrations"],
  summary: "Check Cloudflare token configuration status",
  operationId: "getCloudflareStatus",
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.object({
            configured: z.boolean(),
            encrypted: z.boolean(),
          }),
        },
      },
      description: "Cloudflare integration status",
    },
  },
});

integrationsRouter.openapi(getCfStatusRoute, async (c) => {
  const pm = getProjectManager(c);
  const token = await pm.getIntegrationSecret("cloudflare", "token");

  return c.json(
    {
      configured: token !== null,
      encrypted: isEncryptionEnabled(),
    },
    200,
  );
});

// DELETE /integrations/cloudflare — remove all Cloudflare credentials
const deleteCfRoute = createRoute({
  method: "delete",
  path: "/cloudflare",
  tags: ["Integrations"],
  summary: "Remove Cloudflare credentials",
  operationId: "deleteCloudflareCredentials",
  responses: {
    200: {
      content: { "application/json": { schema: SuccessSchema } },
      description: "Credentials removed",
    },
  },
});

integrationsRouter.openapi(deleteCfRoute, async (c) => {
  const pm = getProjectManager(c);
  await pm.deleteIntegrationSecrets("cloudflare");
  return c.json({ success: true }, 200);
});

// GET /integrations/cloudflare/zones — preview domains from Cloudflare (no writes)
const listCfZonesRoute = createRoute({
  method: "get",
  path: "/cloudflare/zones",
  tags: ["Integrations"],
  summary: "Preview domains from Cloudflare API",
  operationId: "listCloudflareZones",
  responses: {
    200: {
      content: { "application/json": { schema: z.any() } },
      description: "List of Cloudflare domains",
    },
    400: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Token not configured",
    },
    502: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Cloudflare API error",
    },
  },
});

integrationsRouter.openapi(listCfZonesRoute, async (c) => {
  const pm = getProjectManager(c);
  const token = await pm.getIntegrationSecret("cloudflare", "token");
  if (!token) return c.json({ error: "Cloudflare token not configured" }, 400);

  try {
    const provider = new CloudflareDnsProvider(token);
    const domains = await provider.fetchDomains();
    return c.json({ domains }, 200);
  } catch (err) {
    return c.json(
      { error: err instanceof Error ? err.message : "Cloudflare API error" },
      502,
    );
  }
});

// --- GitHub integration ---

// POST /integrations/github — save PAT
const saveGhTokenRoute = createRoute({
  method: "post",
  path: "/github",
  tags: ["Integrations"],
  summary: "Save GitHub personal access token",
  operationId: "saveGitHubToken",
  request: {
    body: {
      content: {
        "application/json": {
          schema: z.object({
            token: z.string(),
          }),
        },
      },
      required: true,
    },
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.object({
            success: z.boolean(),
            encrypted: z.boolean(),
          }),
        },
      },
      description: "Token saved",
    },
    400: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Missing token",
    },
  },
});

integrationsRouter.openapi(saveGhTokenRoute, async (c) => {
  const pm = getProjectManager(c);
  const body = c.req.valid("json");
  const token = body.token?.trim();

  if (!token) {
    return c.json({ error: "token is required" }, 400);
  }

  await pm.setIntegrationSecret("github", "token", token);

  return c.json(
    {
      success: true,
      encrypted: isEncryptionEnabled(),
    },
    200,
  );
});

// GET /integrations/github — presence + encryption status (never the token)
const getGhStatusRoute = createRoute({
  method: "get",
  path: "/github",
  tags: ["Integrations"],
  summary: "Check GitHub token configuration status",
  operationId: "getGitHubStatus",
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.object({
            configured: z.boolean(),
            encrypted: z.boolean(),
          }),
        },
      },
      description: "GitHub integration status",
    },
  },
});

integrationsRouter.openapi(getGhStatusRoute, async (c) => {
  const pm = getProjectManager(c);
  const token = await pm.getIntegrationSecret("github", "token");

  return c.json(
    {
      configured: token !== null,
      encrypted: isEncryptionEnabled(),
    },
    200,
  );
});

// DELETE /integrations/github — remove GitHub credentials
const deleteGhRoute = createRoute({
  method: "delete",
  path: "/github",
  tags: ["Integrations"],
  summary: "Remove GitHub credentials",
  operationId: "deleteGitHubCredentials",
  responses: {
    200: {
      content: { "application/json": { schema: SuccessSchema } },
      description: "Credentials removed",
    },
  },
});

integrationsRouter.openapi(deleteGhRoute, async (c) => {
  const pm = getProjectManager(c);
  await pm.deleteIntegrationSecrets("github");
  return c.json({ success: true }, 200);
});

// GET /integrations/github/test — verify PAT by calling GET /user
const testGhTokenRoute = createRoute({
  method: "get",
  path: "/github/test",
  tags: ["Integrations"],
  summary: "Verify GitHub token by calling GET /user",
  operationId: "testGitHubToken",
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.object({ login: z.string() }),
        },
      },
      description: "Authenticated GitHub user",
    },
    400: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Token not configured",
    },
    502: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "GitHub API error",
    },
  },
});

integrationsRouter.openapi(testGhTokenRoute, async (c) => {
  const pm = getProjectManager(c);
  const token = await pm.getIntegrationSecret("github", "token");
  if (!token) return c.json({ error: "GitHub token not configured" }, 400);

  try {
    const provider = new GitHubApiProvider(token);
    const user = await provider.getAuthenticatedUser();
    return c.json({ login: user.login }, 200);
  } catch (err) {
    return c.json(
      { error: err instanceof Error ? err.message : "GitHub API error" },
      502,
    );
  }
});

// POST /dns/sync/cloudflare — upsert all CF registrar domains (sync contract enforced)
// Note: mounted on integrationsRouter but accessed at /api/dns/sync/cloudflare via
// a separate route in index.ts
export async function handleCloudflareDnsSync(
  pm: ProjectManager,
  parser: DirectoryMarkdownParser,
): Promise<{ synced: number; created: number; updated: number }> {
  const token = await pm.getIntegrationSecret("cloudflare", "token");
  if (!token) throw new Error("Cloudflare token not configured");

  const provider = new CloudflareDnsProvider(token);
  const results = await provider.fetchDomains();

  const existing = await parser.readDnsDomains();
  const byDomain = new Map(existing.map((d) => [d.domain.toLowerCase(), d]));

  let created = 0;
  let updated = 0;

  for (const result of results) {
    const key = result.domain.toLowerCase();
    const current = byDomain.get(key);

    // CF is authoritative: write all fields it provides (skip undefined keys only)
    const syncFields: Record<string, unknown> = {
      lastFetchedAt: result.synced.lastFetchedAt,
    };
    if (result.synced.nameservers !== undefined) {
      syncFields.nameservers = result.synced.nameservers;
    }
    if (result.synced.dnsRecords !== undefined) {
      syncFields.dnsRecords = result.synced.dnsRecords;
    }
    if (result.synced.status !== undefined) {
      syncFields.status = result.synced.status;
    }
    if (result.synced.expiryDate !== undefined) {
      syncFields.expiryDate = result.synced.expiryDate;
    }
    if (result.synced.autoRenew !== undefined) {
      syncFields.autoRenew = result.synced.autoRenew;
    }

    if (current) {
      await parser.updateDnsDomain(current.id, syncFields);
      updated++;
    } else {
      await parser.addDnsDomain({
        domain: result.domain,
        provider: "cloudflare",
        ...syncFields,
      });
      created++;
    }
  }

  return { synced: results.length, created, updated };
}
