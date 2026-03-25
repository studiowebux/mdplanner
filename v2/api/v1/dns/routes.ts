// DNS domain CRUD + Cloudflare sync routes — OpenAPIHono router consumed by api/mod.ts.

import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { getDnsService } from "../../../singletons/services.ts";
import { publish } from "../../../singletons/event-bus.ts";
import {
  CreateDnsDomainSchema,
  DnsDomainSchema,
  DnsRecordSchema,
  DnsSyncResponseSchema,
  UpdateDnsDomainSchema,
  UpdateDnsRecordSchema,
} from "../../../types/dns.types.ts";
import { ErrorSchema, IdParam, IdWithIndexParam } from "../../../types/api.ts";

export const dnsRouter = new OpenAPIHono();

// ---------------------------------------------------------------------------
// Domain CRUD
// ---------------------------------------------------------------------------

// GET /
const listDnsRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["DNS"],
  summary: "List all DNS domains",
  operationId: "listDnsDomains",
  responses: {
    200: {
      content: { "application/json": { schema: z.array(DnsDomainSchema) } },
      description: "List of DNS domains",
    },
  },
});

dnsRouter.openapi(listDnsRoute, async (c) => {
  const domains = await getDnsService().list();
  return c.json(domains, 200);
});

// GET /{id}
const getDnsRoute = createRoute({
  method: "get",
  path: "/{id}",
  tags: ["DNS"],
  summary: "Get DNS domain by ID",
  operationId: "getDnsDomain",
  request: { params: IdParam },
  responses: {
    200: {
      content: { "application/json": { schema: DnsDomainSchema } },
      description: "DNS domain",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

dnsRouter.openapi(getDnsRoute, async (c) => {
  const { id } = c.req.valid("param");
  const domain = await getDnsService().getById(id);
  if (!domain) {
    return c.json(
      { error: "DNS_DOMAIN_NOT_FOUND", message: `DNS domain ${id} not found` },
      404,
    );
  }
  return c.json(domain, 200);
});

// POST /
const createDnsRoute = createRoute({
  method: "post",
  path: "/",
  tags: ["DNS"],
  summary: "Create a DNS domain",
  operationId: "createDnsDomain",
  request: {
    body: {
      content: { "application/json": { schema: CreateDnsDomainSchema } },
      required: true,
    },
  },
  responses: {
    201: {
      content: { "application/json": { schema: DnsDomainSchema } },
      description: "Created DNS domain",
    },
  },
});

dnsRouter.openapi(createDnsRoute, async (c) => {
  const data = c.req.valid("json");
  const domain = await getDnsService().create(data);
  publish("dns.created");
  return c.json(domain, 201);
});

// PUT /{id}
const updateDnsRoute = createRoute({
  method: "put",
  path: "/{id}",
  tags: ["DNS"],
  summary: "Update a DNS domain",
  operationId: "updateDnsDomain",
  request: {
    params: IdParam,
    body: {
      content: { "application/json": { schema: UpdateDnsDomainSchema } },
      required: true,
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: DnsDomainSchema } },
      description: "Updated DNS domain",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

dnsRouter.openapi(updateDnsRoute, async (c) => {
  const { id } = c.req.valid("param");
  const data = c.req.valid("json");
  const domain = await getDnsService().update(id, data);
  if (!domain) {
    return c.json(
      { error: "DNS_DOMAIN_NOT_FOUND", message: `DNS domain ${id} not found` },
      404,
    );
  }
  publish("dns.updated");
  return c.json(domain, 200);
});

// DELETE /{id}
const deleteDnsRoute = createRoute({
  method: "delete",
  path: "/{id}",
  tags: ["DNS"],
  summary: "Delete a DNS domain",
  operationId: "deleteDnsDomain",
  request: { params: IdParam },
  responses: {
    204: { description: "Deleted" },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

dnsRouter.openapi(deleteDnsRoute, async (c) => {
  const { id } = c.req.valid("param");
  const ok = await getDnsService().delete(id);
  if (!ok) {
    return c.json(
      { error: "DNS_DOMAIN_NOT_FOUND", message: `DNS domain ${id} not found` },
      404,
    );
  }
  publish("dns.deleted");
  return new Response(null, { status: 204 });
});

// ---------------------------------------------------------------------------
// Cloudflare sync
// ---------------------------------------------------------------------------

// POST /sync/cloudflare
const syncCloudflareRoute = createRoute({
  method: "post",
  path: "/sync/cloudflare",
  tags: ["DNS"],
  summary: "Sync domains and records from Cloudflare",
  operationId: "syncCloudflare",
  responses: {
    200: {
      content: { "application/json": { schema: DnsSyncResponseSchema } },
      description: "Sync results",
    },
    400: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Cloudflare token not configured",
    },
    502: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Cloudflare API error",
    },
  },
});

dnsRouter.openapi(syncCloudflareRoute, async (c) => {
  try {
    const result = await getDnsService().syncCloudflare();
    publish("dns.synced");
    return c.json(result, 200);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.startsWith("CLOUDFLARE_TOKEN_MISSING")) {
      return c.json(
        {
          error: "CLOUDFLARE_TOKEN_MISSING",
          message:
            "Cloudflare token not configured. Set it in Settings > Project.",
        },
        400,
      );
    }
    return c.json({ error: "CLOUDFLARE_API_ERROR", message: msg }, 502);
  }
});

// ---------------------------------------------------------------------------
// DNS record operations
// ---------------------------------------------------------------------------

// GET /{id}/records
const listDnsRecordsRoute = createRoute({
  method: "get",
  path: "/{id}/records",
  tags: ["DNS"],
  summary: "List DNS records for a domain",
  operationId: "listDnsRecords",
  request: { params: IdParam },
  responses: {
    200: {
      content: { "application/json": { schema: z.array(DnsRecordSchema) } },
      description: "List of DNS records",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Domain not found",
    },
  },
});

dnsRouter.openapi(listDnsRecordsRoute, async (c) => {
  const { id } = c.req.valid("param");
  const domain = await getDnsService().getById(id);
  if (!domain) {
    return c.json(
      { error: "DNS_DOMAIN_NOT_FOUND", message: `DNS domain ${id} not found` },
      404,
    );
  }
  return c.json(domain.dnsRecords ?? [], 200);
});

// POST /{id}/records
const addDnsRecordRoute = createRoute({
  method: "post",
  path: "/{id}/records",
  tags: ["DNS"],
  summary: "Add a DNS record to a domain",
  operationId: "addDnsRecord",
  request: {
    params: IdParam,
    body: {
      content: { "application/json": { schema: DnsRecordSchema } },
      required: true,
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: DnsDomainSchema } },
      description: "Updated domain with new record",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Domain not found",
    },
  },
});

dnsRouter.openapi(addDnsRecordRoute, async (c) => {
  const { id } = c.req.valid("param");
  const record = c.req.valid("json");
  const domain = await getDnsService().addRecord(id, record);
  if (!domain) {
    return c.json(
      { error: "DNS_DOMAIN_NOT_FOUND", message: `DNS domain ${id} not found` },
      404,
    );
  }
  publish("dns.updated");
  return c.json(domain, 200);
});

// PUT /{id}/records/{index}
const updateDnsRecordRoute = createRoute({
  method: "put",
  path: "/{id}/records/{index}",
  tags: ["DNS"],
  summary: "Update a DNS record by index",
  operationId: "updateDnsRecord",
  request: {
    params: IdWithIndexParam,
    body: {
      content: { "application/json": { schema: UpdateDnsRecordSchema } },
      required: true,
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: DnsDomainSchema } },
      description: "Updated domain",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Domain or record not found",
    },
  },
});

dnsRouter.openapi(updateDnsRecordRoute, async (c) => {
  const { id, index } = c.req.valid("param");
  const fields = c.req.valid("json");
  const domain = await getDnsService().updateRecord(id, Number(index), fields);
  if (!domain) {
    return c.json(
      { error: "DNS_DOMAIN_NOT_FOUND", message: `DNS domain ${id} not found` },
      404,
    );
  }
  publish("dns.updated");
  return c.json(domain, 200);
});

// DELETE /{id}/records/{index}
const deleteDnsRecordRoute = createRoute({
  method: "delete",
  path: "/{id}/records/{index}",
  tags: ["DNS"],
  summary: "Delete a DNS record by index",
  operationId: "deleteDnsRecord",
  request: { params: IdWithIndexParam },
  responses: {
    200: {
      content: { "application/json": { schema: DnsDomainSchema } },
      description: "Updated domain after record deletion",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Domain not found",
    },
  },
});

dnsRouter.openapi(deleteDnsRecordRoute, async (c) => {
  const { id, index } = c.req.valid("param");
  const domain = await getDnsService().deleteRecord(id, Number(index));
  if (!domain) {
    return c.json(
      { error: "DNS_DOMAIN_NOT_FOUND", message: `DNS domain ${id} not found` },
      404,
    );
  }
  publish("dns.updated");
  return c.json(domain, 200);
});
