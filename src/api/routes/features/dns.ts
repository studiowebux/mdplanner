/**
 * DNS domain CRUD routes.
 */

import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { handleCloudflareDnsSync } from "../integrations.ts";
import {
  AppVariables,
  cachePurge,
  cacheWriteThrough,
  getParser,
  getProjectManager,
} from "../context.ts";

export const dnsRouter = new OpenAPIHono<{ Variables: AppVariables }>();

const ErrorSchema = z.object({
  error: z.string(),
  message: z.string().optional(),
});
const idParam = z.object({
  id: z.string().openapi({ param: { name: "id", in: "path" } }),
});
const SuccessSchema = z.object({ success: z.boolean() });

// --- Route definitions ---

const listDnsRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["DNS"],
  summary: "List all DNS domains",
  operationId: "listDnsDomains",
  responses: {
    200: {
      content: { "application/json": { schema: z.array(z.any()) } },
      description: "List of DNS domains",
    },
  },
});

const getDnsRoute = createRoute({
  method: "get",
  path: "/{id}",
  tags: ["DNS"],
  summary: "Get a single DNS domain",
  operationId: "getDnsDomain",
  request: { params: idParam },
  responses: {
    200: {
      content: { "application/json": { schema: z.any() } },
      description: "DNS domain details",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

const createDnsRoute = createRoute({
  method: "post",
  path: "/",
  tags: ["DNS"],
  summary: "Create DNS domain",
  operationId: "createDnsDomain",
  request: {
    body: {
      content: {
        "application/json": { schema: z.any() },
      },
      required: true,
    },
  },
  responses: {
    201: {
      content: {
        "application/json": {
          schema: z.object({ success: z.boolean(), id: z.string() }),
        },
      },
      description: "DNS domain created",
    },
  },
});

const updateDnsRoute = createRoute({
  method: "put",
  path: "/{id}",
  tags: ["DNS"],
  summary: "Update DNS domain",
  operationId: "updateDnsDomain",
  request: {
    params: idParam,
    body: {
      content: {
        "application/json": { schema: z.any() },
      },
      required: true,
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: SuccessSchema } },
      description: "DNS domain updated",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

const deleteDnsRoute = createRoute({
  method: "delete",
  path: "/{id}",
  tags: ["DNS"],
  summary: "Delete DNS domain",
  operationId: "deleteDnsDomain",
  request: { params: idParam },
  responses: {
    200: {
      content: { "application/json": { schema: SuccessSchema } },
      description: "DNS domain deleted",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

const syncCloudflareDnsRoute = createRoute({
  method: "post",
  path: "/sync/cloudflare",
  tags: ["DNS"],
  summary: "Sync DNS domains from Cloudflare",
  operationId: "syncCloudflareDns",
  responses: {
    200: {
      content: { "application/json": { schema: z.any() } },
      description: "Sync result",
    },
    400: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not configured",
    },
    502: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Sync failed",
    },
  },
});

// --- Handlers ---

dnsRouter.openapi(listDnsRoute, async (c) => {
  const parser = getParser(c);
  const domains = await parser.readDnsDomains();
  return c.json(domains, 200);
});

dnsRouter.openapi(getDnsRoute, async (c) => {
  const parser = getParser(c);
  const { id } = c.req.valid("param");
  const domains = await parser.readDnsDomains();
  const domain = domains.find((d) => d.id === id);
  if (!domain) return c.json({ error: "Not found" }, 404);
  return c.json(domain, 200);
});

dnsRouter.openapi(createDnsRoute, async (c) => {
  const parser = getParser(c);
  const body = c.req.valid("json");
  const domain = await parser.addDnsDomain({
    domain: body.domain,
    expiryDate: body.expiryDate,
    autoRenew: body.autoRenew,
    renewalCostUsd: body.renewalCostUsd,
    provider: body.provider,
    nameservers: body.nameservers,
    notes: body.notes,
    lastFetchedAt: body.lastFetchedAt,
    project: body.project,
  });
  await cacheWriteThrough(c, "dns_domains");
  return c.json({ success: true, id: domain.id }, 201);
});

dnsRouter.openapi(updateDnsRoute, async (c) => {
  const parser = getParser(c);
  const { id } = c.req.valid("param");
  const body = c.req.valid("json");

  // Build a partial update — omit keys absent from the request body so that
  // batch operations (e.g. set renewal cost) do not overwrite unrelated fields.
  const updates: Record<string, unknown> = {};
  const allowed = [
    "domain",
    "expiryDate",
    "autoRenew",
    "renewalCostUsd",
    "provider",
    "nameservers",
    "notes",
    "lastFetchedAt",
    "project",
  ];
  for (const key of allowed) {
    if (key in body) updates[key] = body[key];
  }

  const updated = await parser.updateDnsDomain(id, updates);
  if (!updated) return c.json({ error: "Not found" }, 404);
  await cacheWriteThrough(c, "dns_domains");
  return c.json({ success: true }, 200);
});

dnsRouter.openapi(deleteDnsRoute, async (c) => {
  const parser = getParser(c);
  const { id } = c.req.valid("param");
  const deleted = await parser.deleteDnsDomain(id);
  if (!deleted) return c.json({ error: "Not found" }, 404);
  cachePurge(c, "dns_domains", id);
  return c.json({ success: true }, 200);
});

dnsRouter.openapi(syncCloudflareDnsRoute, async (c) => {
  const pm = getProjectManager(c);
  const parser = getParser(c);
  try {
    const result = await handleCloudflareDnsSync(pm, parser);
    await cacheWriteThrough(c, "dns_domains");
    return c.json({ success: true, ...result }, 200);
  } catch (err) {
    const status =
      err instanceof Error && err.message.includes("not configured")
        ? 400
        : 502;
    return c.json(
      {
        error: err instanceof Error ? err.message : "Sync failed",
      },
      status,
    );
  }
});
