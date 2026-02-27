/**
 * Integration secrets routes.
 * Manages provider credentials stored (optionally encrypted) in project.md.
 *
 * POST   /api/integrations/cloudflare          — save Cloudflare API token
 * GET    /api/integrations/cloudflare           — check if token is configured
 * DELETE /api/integrations/cloudflare           — remove Cloudflare credentials
 * GET    /api/integrations/cloudflare/zones     — preview domains from CF API
 * POST   /api/dns/sync/cloudflare               — upsert all CF registrar domains
 */

import { Hono } from "hono";
import { isEncryptionEnabled } from "../../lib/secrets.ts";
import { CloudflareDnsProvider } from "../../lib/integrations/providers/cloudflare-dns.ts";
import { ProjectManager } from "../../lib/project-manager.ts";
import { DirectoryMarkdownParser } from "../../lib/parser/directory/parser.ts";
import {
  AppVariables,
  errorResponse,
  getParser,
  getProjectManager,
  jsonResponse,
} from "./context.ts";

export const integrationsRouter = new Hono<{ Variables: AppVariables }>();

// POST /integrations/cloudflare — save token (account ID is auto-fetched later)
integrationsRouter.post("/cloudflare", async (c) => {
  const pm = getProjectManager(c);
  const body = await c.req.json();
  const token = body.token?.trim();

  if (!token) return errorResponse("token is required", 400);

  await pm.setIntegrationSecret("cloudflare", "token", token);

  return jsonResponse({
    success: true,
    encrypted: isEncryptionEnabled(),
  });
});

// GET /integrations/cloudflare — return presence + encryption status (never the token)
integrationsRouter.get("/cloudflare", async (c) => {
  const pm = getProjectManager(c);
  const token = await pm.getIntegrationSecret("cloudflare", "token");

  return jsonResponse({
    configured: token !== null,
    encrypted: isEncryptionEnabled(),
  });
});

// DELETE /integrations/cloudflare — remove all Cloudflare credentials
integrationsRouter.delete("/cloudflare", async (c) => {
  const pm = getProjectManager(c);
  await pm.deleteIntegrationSecrets("cloudflare");
  return jsonResponse({ success: true });
});

// GET /integrations/cloudflare/zones — preview domains from Cloudflare (no writes)
integrationsRouter.get("/cloudflare/zones", async (c) => {
  const pm = getProjectManager(c);
  const token = await pm.getIntegrationSecret("cloudflare", "token");
  if (!token) return errorResponse("Cloudflare token not configured", 400);

  try {
    const provider = new CloudflareDnsProvider(token);
    const domains = await provider.fetchDomains();
    return jsonResponse({ domains });
  } catch (err) {
    return errorResponse(
      err instanceof Error ? err.message : "Cloudflare API error",
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

    // Sync contract: only write expiryDate, autoRenew, lastFetchedAt
    const syncFields = {
      expiryDate: result.synced.expiryDate,
      autoRenew: result.synced.autoRenew,
      lastFetchedAt: result.synced.lastFetchedAt,
    };

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
