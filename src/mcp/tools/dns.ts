/**
 * MCP tools for DNS domain operations.
 * Tools: list_dns_domains, get_dns_domain, create_dns_domain,
 *        update_dns_domain, delete_dns_domain, sync_cloudflare_dns,
 *        list_dns_records, add_dns_record, update_dns_record, delete_dns_record
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ProjectManager } from "../../lib/project-manager.ts";
import { err, ok } from "./utils.ts";

export function registerDnsTools(
  server: McpServer,
  pm: ProjectManager,
): void {
  const parser = pm.getActiveParser();

  server.registerTool(
    "list_dns_domains",
    {
      description: "List all tracked DNS domains.",
      inputSchema: {},
    },
    async () => ok(await parser.readDnsDomains()),
  );

  server.registerTool(
    "get_dns_domain",
    {
      description: "Get a single DNS domain by its ID.",
      inputSchema: { id: z.string().describe("Domain ID") },
    },
    async ({ id }) => {
      const domains = await parser.readDnsDomains();
      const domain = domains.find((d) => d.id === id);
      if (!domain) return err(`DNS domain '${id}' not found`);
      return ok(domain);
    },
  );

  server.registerTool(
    "create_dns_domain",
    {
      description: "Add a new domain to track.",
      inputSchema: {
        domain: z.string().describe("Domain name (e.g. example.com)"),
        expiry_date: z.string().optional().describe(
          "Registration expiry date (YYYY-MM-DD)",
        ),
        auto_renew: z.boolean().optional().describe(
          "Whether the domain auto-renews",
        ),
        renewal_cost_usd: z.number().optional().describe(
          "Annual renewal cost in USD",
        ),
        provider: z.string().optional().describe(
          "Registrar or DNS provider (e.g. 'cloudflare', 'namecheap')",
        ),
        nameservers: z.array(z.string()).optional(),
        notes: z.string().optional(),
      },
    },
    async ({
      domain,
      expiry_date,
      auto_renew,
      renewal_cost_usd,
      provider,
      nameservers,
      notes,
    }) => {
      const created = await parser.addDnsDomain({
        domain,
        ...(expiry_date && { expiryDate: expiry_date }),
        ...(auto_renew !== undefined && { autoRenew: auto_renew }),
        ...(renewal_cost_usd !== undefined && {
          renewalCostUsd: renewal_cost_usd,
        }),
        ...(provider && { provider }),
        ...(nameservers?.length && { nameservers }),
        ...(notes && { notes }),
      });
      return ok({ id: created.id });
    },
  );

  server.registerTool(
    "update_dns_domain",
    {
      description: "Update an existing DNS domain record.",
      inputSchema: {
        id: z.string().describe("Domain ID"),
        domain: z.string().optional(),
        expiry_date: z.string().optional(),
        auto_renew: z.boolean().optional(),
        renewal_cost_usd: z.number().optional(),
        provider: z.string().optional(),
        nameservers: z.array(z.string()).optional(),
        notes: z.string().optional(),
      },
    },
    async ({
      id,
      expiry_date,
      auto_renew,
      renewal_cost_usd,
      ...rest
    }) => {
      const updated = await parser.updateDnsDomain(id, {
        ...rest,
        ...(expiry_date !== undefined && { expiryDate: expiry_date }),
        ...(auto_renew !== undefined && { autoRenew: auto_renew }),
        ...(renewal_cost_usd !== undefined && {
          renewalCostUsd: renewal_cost_usd,
        }),
      });
      if (!updated) return err(`DNS domain '${id}' not found`);
      return ok({ success: true });
    },
  );

  server.registerTool(
    "delete_dns_domain",
    {
      description: "Delete a DNS domain by its ID.",
      inputSchema: { id: z.string().describe("Domain ID") },
    },
    async ({ id }) => {
      const success = await parser.deleteDnsDomain(id);
      if (!success) return err(`DNS domain '${id}' not found`);
      return ok({ success: true });
    },
  );

  server.registerTool(
    "sync_cloudflare_dns",
    {
      description:
        "Sync all domains from Cloudflare into the DNS tracker. Requires a Cloudflare API token configured in project settings.",
      inputSchema: {},
    },
    async () => {
      try {
        const { handleCloudflareDnsSync } = await import(
          "../../api/routes/integrations.ts"
        );
        const result = await handleCloudflareDnsSync(pm, parser);
        return ok(result);
      } catch (e) {
        return err(
          e instanceof Error ? e.message : "Cloudflare sync failed",
        );
      }
    },
  );

  // --- DNS Record management (per-domain) ---

  server.registerTool(
    "list_dns_records",
    {
      description:
        "List DNS records for a specific domain. Returns records synced from Cloudflare or manually added.",
      inputSchema: {
        domain_id: z.string().describe("Domain ID"),
      },
    },
    async ({ domain_id }) => {
      const domains = await parser.readDnsDomains();
      const domain = domains.find((d) => d.id === domain_id);
      if (!domain) return err(`DNS domain '${domain_id}' not found`);
      return ok(domain.dnsRecords ?? []);
    },
  );

  server.registerTool(
    "add_dns_record",
    {
      description: "Add a DNS record to a domain.",
      inputSchema: {
        domain_id: z.string().describe("Domain ID"),
        type: z.string().describe(
          "Record type (A, AAAA, CNAME, MX, TXT, NS, SRV, etc.)",
        ),
        name: z.string().describe(
          "Record name (e.g. '@', 'www', 'mail')",
        ),
        value: z.string().describe("Record value"),
        ttl: z.number().optional().default(3600).describe("TTL in seconds (default: 3600)"),
        proxied: z.boolean().optional().describe(
          "Whether the record is proxied (Cloudflare-specific)",
        ),
      },
    },
    async ({ domain_id, type, name, value, ttl, proxied }) => {
      const domains = await parser.readDnsDomains();
      const domain = domains.find((d) => d.id === domain_id);
      if (!domain) return err(`DNS domain '${domain_id}' not found`);
      const records = domain.dnsRecords ?? [];
      records.push({
        type,
        name,
        value,
        ttl: ttl ?? 3600,
        ...(proxied !== undefined && { proxied }),
      });
      await parser.updateDnsDomain(domain_id, { dnsRecords: records });
      return ok({ success: true, count: records.length });
    },
  );

  server.registerTool(
    "update_dns_record",
    {
      description:
        "Update a DNS record on a domain by its index in the records array.",
      inputSchema: {
        domain_id: z.string().describe("Domain ID"),
        record_index: z.number().int().min(0).describe(
          "Zero-based index of the record in the domain's dnsRecords array",
        ),
        type: z.string().optional(),
        name: z.string().optional(),
        value: z.string().optional(),
        ttl: z.number().optional(),
        proxied: z.boolean().optional(),
      },
    },
    async ({ domain_id, record_index, ...fields }) => {
      const domains = await parser.readDnsDomains();
      const domain = domains.find((d) => d.id === domain_id);
      if (!domain) return err(`DNS domain '${domain_id}' not found`);
      const records = domain.dnsRecords ?? [];
      if (record_index >= records.length) {
        return err(
          `Record index ${record_index} out of range (domain has ${records.length} records)`,
        );
      }
      const existing = records[record_index];
      records[record_index] = {
        type: fields.type ?? existing.type,
        name: fields.name ?? existing.name,
        value: fields.value ?? existing.value,
        ttl: fields.ttl ?? existing.ttl,
        proxied: fields.proxied ?? existing.proxied,
      };
      await parser.updateDnsDomain(domain_id, { dnsRecords: records });
      return ok({ success: true });
    },
  );

  server.registerTool(
    "delete_dns_record",
    {
      description:
        "Delete a DNS record from a domain by its index in the records array.",
      inputSchema: {
        domain_id: z.string().describe("Domain ID"),
        record_index: z.number().int().min(0).describe(
          "Zero-based index of the record to delete",
        ),
      },
    },
    async ({ domain_id, record_index }) => {
      const domains = await parser.readDnsDomains();
      const domain = domains.find((d) => d.id === domain_id);
      if (!domain) return err(`DNS domain '${domain_id}' not found`);
      const records = domain.dnsRecords ?? [];
      if (record_index >= records.length) {
        return err(
          `Record index ${record_index} out of range (domain has ${records.length} records)`,
        );
      }
      records.splice(record_index, 1);
      await parser.updateDnsDomain(domain_id, { dnsRecords: records });
      return ok({ success: true, remaining: records.length });
    },
  );
}
