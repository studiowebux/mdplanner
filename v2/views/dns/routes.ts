// DNS view routes — factory list/create/edit + custom detail, record CRUD, sync.

import { createDomainRoutes } from "../../factories/domain-routes.ts";
import { dnsConfig } from "../../domains/dns/config.tsx";
import { getDnsService } from "../../singletons/services.ts";
import { publish } from "../../singletons/event-bus.ts";
import { DnsRecordForm, DnsRecordsTable } from "../dns-detail.tsx";
import { hxTrigger } from "../../utils/hx-trigger.ts";
import type { DnsRecord } from "../../types/dns.types.ts";

export const dnsRouter = createDomainRoutes(dnsConfig);

// ---------------------------------------------------------------------------
// Cloudflare sync
// ---------------------------------------------------------------------------

dnsRouter.post("/sync", async (c) => {
  try {
    const result = await getDnsService().syncCloudflare();
    publish("dns.synced");
    return new Response(null, {
      status: 200,
      headers: {
        "HX-Trigger": JSON.stringify({
          showToast: {
            type: "success",
            message:
              `Synced ${result.synced} domain(s): ${result.created} created, ${result.updated} updated`,
          },
        }),
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(null, {
      status: 200,
      headers: {
        "HX-Trigger": JSON.stringify({
          showToast: { type: "error", message: msg },
        }),
      },
    });
  }
});

// ---------------------------------------------------------------------------
// DNS record CRUD (index-based)
// ---------------------------------------------------------------------------

// GET /:id/records/new — render blank record form in sidenav
dnsRouter.get("/:id/records/new", (c) => {
  const id = c.req.param("id");
  return c.html(DnsRecordForm({ domainId: id }) as unknown as string);
});

// GET /:id/records/:index/edit — render populated record form in sidenav
dnsRouter.get("/:id/records/:index/edit", async (c) => {
  const id = c.req.param("id");
  const index = Number(c.req.param("index"));
  const domain = await getDnsService().getById(id);
  const record = domain?.dnsRecords?.[index];
  if (!domain || !record) return c.notFound();
  const values: Record<string, string> = {
    type: record.type,
    name: record.name,
    value: record.value,
    ttl: String(record.ttl),
    proxied: record.proxied ? "true" : "",
  };
  return c.html(
    DnsRecordForm({ domainId: id, index, values }) as unknown as string,
  );
});

// POST /:id/records — add record, return refreshed records table
dnsRouter.post("/:id/records", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.parseBody();
  const domain = await getDnsService().addRecord(id, {
    type: String(body.type || ""),
    name: String(body.name || ""),
    value: String(body.value || ""),
    ttl: Number(body.ttl) || 3600,
    proxied: body.proxied === "true",
  });
  if (!domain) return c.notFound();
  publish("dns.updated");
  return c.html(DnsRecordsTable({ domain }) as unknown as string, 200, {
    "HX-Trigger": hxTrigger("success", "Record added"),
  });
});

// POST /:id/records/:index — update record, return refreshed records table
dnsRouter.post("/:id/records/:index", async (c) => {
  const id = c.req.param("id");
  const index = Number(c.req.param("index"));
  const body = await c.req.parseBody();
  const fields: Partial<DnsRecord> = {};
  if (body.type) fields.type = String(body.type);
  if (body.name) fields.name = String(body.name);
  if (body.value) fields.value = String(body.value);
  if (body.ttl) fields.ttl = Number(body.ttl);
  if (body.proxied !== undefined) fields.proxied = body.proxied === "true";
  const domain = await getDnsService().updateRecord(id, index, fields);
  if (!domain) return c.notFound();
  publish("dns.updated");
  return c.html(DnsRecordsTable({ domain }) as unknown as string, 200, {
    "HX-Trigger": hxTrigger("success", "Record updated"),
  });
});

// DELETE /:id/records/:index — delete record, return refreshed records table
dnsRouter.delete("/:id/records/:index", async (c) => {
  const id = c.req.param("id");
  const index = Number(c.req.param("index"));
  const domain = await getDnsService().deleteRecord(id, index);
  if (!domain) return c.notFound();
  publish("dns.updated");
  return c.html(DnsRecordsTable({ domain }) as unknown as string, 200, {
    "HX-Trigger": hxTrigger("success", "Record deleted"),
  });
});
