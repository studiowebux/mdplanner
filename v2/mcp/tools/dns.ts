// MCP tools for DNS domain operations — thin wrappers over DnsService.
// All Zod schemas derived from types/dns.types.ts — single source of truth.

import { z } from "@hono/zod-openapi";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getDnsService } from "../../singletons/services.ts";
import {
  CreateDnsDomainSchema,
  DnsDomainSchema,
  DnsRecordSchema,
  UpdateDnsDomainSchema,
  UpdateDnsRecordSchema,
} from "../../types/dns.types.ts";
import { err, ok } from "../utils.ts";

const DomainIdInput = DnsDomainSchema.shape.id.describe("DNS domain ID");
const RecordIndexInput = z.number().int().min(0).describe(
  "Zero-based index of the record in the dnsRecords array",
);

export function registerDnsTools(server: McpServer): void {
  const service = getDnsService();

  // -------------------------------------------------------------------------
  // Domain CRUD
  // -------------------------------------------------------------------------

  server.registerTool(
    "list_dns_domains",
    {
      description: "List all tracked DNS domains.",
      inputSchema: {},
    },
    async () => ok(await service.list()),
  );

  server.registerTool(
    "get_dns_domain",
    {
      description: "Get a single DNS domain by its ID.",
      inputSchema: { id: DomainIdInput },
    },
    async ({ id }) => {
      const domain = await service.getById(id);
      if (!domain) return err(`DNS domain '${id}' not found`);
      return ok(domain);
    },
  );

  server.registerTool(
    "create_dns_domain",
    {
      description: "Create a new DNS domain entry.",
      inputSchema: CreateDnsDomainSchema.shape,
    },
    async (data) => {
      const domain = await service.create(data);
      return ok({ id: domain.id });
    },
  );

  server.registerTool(
    "update_dns_domain",
    {
      description: "Update fields on an existing DNS domain.",
      inputSchema: {
        id: DomainIdInput,
        ...UpdateDnsDomainSchema.shape,
      },
    },
    async ({ id, ...fields }) => {
      const domain = await service.update(id, fields);
      if (!domain) return err(`DNS domain '${id}' not found`);
      return ok({ success: true });
    },
  );

  server.registerTool(
    "delete_dns_domain",
    {
      description: "Delete a DNS domain by its ID.",
      inputSchema: { id: DomainIdInput },
    },
    async ({ id }) => {
      const success = await service.delete(id);
      if (!success) return err(`DNS domain '${id}' not found`);
      return ok({ success: true });
    },
  );

  // -------------------------------------------------------------------------
  // Cloudflare sync
  // -------------------------------------------------------------------------

  server.registerTool(
    "sync_cloudflare_dns",
    {
      description:
        "Sync DNS domains and records from Cloudflare. Requires cloudflareToken to be set in project config.",
      inputSchema: {},
    },
    async () => {
      try {
        const result = await service.syncCloudflare();
        return ok(result);
      } catch (e) {
        return err(e instanceof Error ? e.message : String(e));
      }
    },
  );

  // -------------------------------------------------------------------------
  // DNS record operations (index-based)
  // -------------------------------------------------------------------------

  server.registerTool(
    "list_dns_records",
    {
      description: "List all DNS records for a given domain.",
      inputSchema: { domain_id: DomainIdInput },
    },
    async ({ domain_id }) => {
      const domain = await service.getById(domain_id);
      if (!domain) return err(`DNS domain '${domain_id}' not found`);
      return ok(domain.dnsRecords ?? []);
    },
  );

  server.registerTool(
    "add_dns_record",
    {
      description: "Add a DNS record to a domain.",
      inputSchema: {
        domain_id: DomainIdInput,
        ...DnsRecordSchema.shape,
      },
    },
    async ({ domain_id, ...record }) => {
      const domain = await service.addRecord(domain_id, record);
      if (!domain) return err(`DNS domain '${domain_id}' not found`);
      return ok({ success: true, count: (domain.dnsRecords ?? []).length });
    },
  );

  server.registerTool(
    "update_dns_record",
    {
      description:
        "Update a DNS record by its zero-based index in the dnsRecords array.",
      inputSchema: {
        domain_id: DomainIdInput,
        index: RecordIndexInput,
        ...UpdateDnsRecordSchema.shape,
      },
    },
    async ({ domain_id, index, ...fields }) => {
      const domain = await service.updateRecord(domain_id, index, fields);
      if (!domain) return err(`DNS domain '${domain_id}' not found`);
      return ok({ success: true });
    },
  );

  server.registerTool(
    "delete_dns_record",
    {
      description:
        "Delete a DNS record by its zero-based index in the dnsRecords array.",
      inputSchema: {
        domain_id: DomainIdInput,
        index: RecordIndexInput,
      },
    },
    async ({ domain_id, index }) => {
      const domain = await service.deleteRecord(domain_id, index);
      if (!domain) return err(`DNS domain '${domain_id}' not found`);
      return ok({ success: true, remaining: (domain.dnsRecords ?? []).length });
    },
  );
}
