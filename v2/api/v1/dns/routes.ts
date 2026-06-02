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
import {
  badGateway,
  errorContent,
  IdParam,
  IdWithIndexParam,
  jsonContent,
  notFound,
  notFoundContent,
} from "../../../types/api.ts";

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
    200: jsonContent(z.array(DnsDomainSchema), "List of DNS domains"),
  },
});

dnsRouter.openapi(listDnsRoute, async (c) => {
  try {
    const domains = await getDnsService().list();
    return c.json(domains, 200);
  } catch (err) {
    throw err;
  }
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
    200: jsonContent(DnsDomainSchema, "DNS domain"),
    404: notFoundContent,
  },
});

dnsRouter.openapi(getDnsRoute, async (c) => {
  try {
    const { id } = c.req.valid("param");
    const domain = await getDnsService().getById(id);
    if (!domain) {
      return c.json(
        notFound("DNS_DOMAIN", id, { error: "DNS_DOMAIN_NOT_FOUND" }),
        404,
      );
    }
    return c.json(domain, 200);
  } catch (err) {
    throw err;
  }
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
    201: jsonContent(DnsDomainSchema, "Created DNS domain"),
  },
});

dnsRouter.openapi(createDnsRoute, async (c) => {
  try {
    const data = c.req.valid("json");
    const domain = await getDnsService().create(data);
    publish("dns.created");
    return c.json(domain, 201);
  } catch (err) {
    throw err;
  }
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
    200: jsonContent(DnsDomainSchema, "Updated DNS domain"),
    404: notFoundContent,
  },
});

dnsRouter.openapi(updateDnsRoute, async (c) => {
  try {
    const { id } = c.req.valid("param");
    const data = c.req.valid("json");
    const domain = await getDnsService().update(id, data);
    if (!domain) {
      return c.json(
        notFound("DNS_DOMAIN", id, { error: "DNS_DOMAIN_NOT_FOUND" }),
        404,
      );
    }
    publish("dns.updated");
    return c.json(domain, 200);
  } catch (err) {
    throw err;
  }
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
    404: notFoundContent,
  },
});

dnsRouter.openapi(deleteDnsRoute, async (c) => {
  try {
    const { id } = c.req.valid("param");
    const ok = await getDnsService().delete(id);
    if (!ok) {
      return c.json(
        notFound("DNS_DOMAIN", id, { error: "DNS_DOMAIN_NOT_FOUND" }),
        404,
      );
    }
    publish("dns.deleted");
    return new Response(null, { status: 204 });
  } catch (err) {
    throw err;
  }
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
    200: jsonContent(DnsSyncResponseSchema, "Sync results"),
    400: errorContent("Cloudflare token not configured"),
    502: errorContent("Cloudflare API error"),
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
    return c.json(badGateway(msg, { error: "CLOUDFLARE_API_ERROR" }), 502);
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
    200: jsonContent(z.array(DnsRecordSchema), "List of DNS records"),
    404: errorContent("Domain not found"),
  },
});

dnsRouter.openapi(listDnsRecordsRoute, async (c) => {
  try {
    const { id } = c.req.valid("param");
    const domain = await getDnsService().getById(id);
    if (!domain) {
      return c.json(
        notFound("DNS_DOMAIN", id, { error: "DNS_DOMAIN_NOT_FOUND" }),
        404,
      );
    }
    return c.json(domain.dnsRecords ?? [], 200);
  } catch (err) {
    throw err;
  }
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
    200: jsonContent(DnsDomainSchema, "Updated domain with new record"),
    404: errorContent("Domain not found"),
  },
});

dnsRouter.openapi(addDnsRecordRoute, async (c) => {
  try {
    const { id } = c.req.valid("param");
    const record = c.req.valid("json");
    const domain = await getDnsService().addRecord(id, record);
    if (!domain) {
      return c.json(
        notFound("DNS_DOMAIN", id, { error: "DNS_DOMAIN_NOT_FOUND" }),
        404,
      );
    }
    publish("dns.updated");
    return c.json(domain, 200);
  } catch (err) {
    throw err;
  }
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
    200: jsonContent(DnsDomainSchema, "Updated domain"),
    404: errorContent("Domain or record not found"),
  },
});

dnsRouter.openapi(updateDnsRecordRoute, async (c) => {
  try {
    const { id, index } = c.req.valid("param");
    const fields = c.req.valid("json");
    const domain = await getDnsService().updateRecord(
      id,
      Number(index),
      fields,
    );
    if (!domain) {
      return c.json(
        notFound("DNS_DOMAIN", id, { error: "DNS_DOMAIN_NOT_FOUND" }),
        404,
      );
    }
    publish("dns.updated");
    return c.json(domain, 200);
  } catch (err) {
    throw err;
  }
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
    200: jsonContent(DnsDomainSchema, "Updated domain after record deletion"),
    404: errorContent("Domain not found"),
  },
});

dnsRouter.openapi(deleteDnsRecordRoute, async (c) => {
  try {
    const { id, index } = c.req.valid("param");
    const domain = await getDnsService().deleteRecord(id, Number(index));
    if (!domain) {
      return c.json(
        notFound("DNS_DOMAIN", id, { error: "DNS_DOMAIN_NOT_FOUND" }),
        404,
      );
    }
    publish("dns.updated");
    return c.json(domain, 200);
  } catch (err) {
    throw err;
  }
});
