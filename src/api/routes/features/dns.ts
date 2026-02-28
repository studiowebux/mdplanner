/**
 * DNS domain CRUD routes.
 */

import { Hono } from "hono";
import { handleCloudflareDnsSync } from "../integrations.ts";
import {
  AppVariables,
  cachePurge,
  cacheWriteThrough,
  errorResponse,
  getParser,
  getProjectManager,
  jsonResponse,
} from "../context.ts";

export const dnsRouter = new Hono<{ Variables: AppVariables }>();

// GET /dns — list all domains
dnsRouter.get("/", async (c) => {
  const parser = getParser(c);
  const domains = await parser.readDnsDomains();
  return jsonResponse(domains);
});

// GET /dns/:id — single domain
dnsRouter.get("/:id", async (c) => {
  const parser = getParser(c);
  const id = c.req.param("id");
  const domains = await parser.readDnsDomains();
  const domain = domains.find((d) => d.id === id);
  if (!domain) return errorResponse("Not found", 404);
  return jsonResponse(domain);
});

// POST /dns — create domain
dnsRouter.post("/", async (c) => {
  const parser = getParser(c);
  const body = await c.req.json();
  const domain = await parser.addDnsDomain({
    domain: body.domain,
    expiryDate: body.expiryDate,
    autoRenew: body.autoRenew,
    renewalCostUsd: body.renewalCostUsd,
    provider: body.provider,
    nameservers: body.nameservers,
    notes: body.notes,
    lastFetchedAt: body.lastFetchedAt,
  });
  await cacheWriteThrough(c, "dns_domains");
  return jsonResponse({ success: true, id: domain.id }, 201);
});

// PUT /dns/:id — update domain
dnsRouter.put("/:id", async (c) => {
  const parser = getParser(c);
  const id = c.req.param("id");
  const body = await c.req.json();
  const updated = await parser.updateDnsDomain(id, {
    domain: body.domain,
    expiryDate: body.expiryDate,
    autoRenew: body.autoRenew,
    renewalCostUsd: body.renewalCostUsd,
    provider: body.provider,
    nameservers: body.nameservers,
    notes: body.notes,
    lastFetchedAt: body.lastFetchedAt,
  });
  if (!updated) return errorResponse("Not found", 404);
  await cacheWriteThrough(c, "dns_domains");
  return jsonResponse({ success: true });
});

// DELETE /dns/:id — delete domain
dnsRouter.delete("/:id", async (c) => {
  const parser = getParser(c);
  const id = c.req.param("id");
  const deleted = await parser.deleteDnsDomain(id);
  if (!deleted) return errorResponse("Not found", 404);
  cachePurge(c, "dns_domains", id);
  return jsonResponse({ success: true });
});

// POST /dns/sync/cloudflare — upsert all CF registrar domains (sync contract enforced)
dnsRouter.post("/sync/cloudflare", async (c) => {
  const pm = getProjectManager(c);
  const parser = getParser(c);
  try {
    const result = await handleCloudflareDnsSync(pm, parser);
    await cacheWriteThrough(c, "dns_domains");
    return jsonResponse({ success: true, ...result });
  } catch (err) {
    return errorResponse(
      err instanceof Error ? err.message : "Sync failed",
      err instanceof Error && err.message.includes("not configured")
        ? 400
        : 502,
    );
  }
});
