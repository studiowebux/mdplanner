/**
 * DNS domain types — Zod schemas (single source), inferred types, IDnsProvider.
 * Pattern: Provider pattern — define interface, implement per vendor (Cloudflare, manual).
 */

import { z } from "@hono/zod-openapi";
import { AuditFieldsSchema } from "./shared.types.ts";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const DNS_PROVIDERS = ["cloudflare", "manual"] as const;

export const DNS_RECORD_TYPES = [
  "A",
  "AAAA",
  "CNAME",
  "MX",
  "TXT",
  "NS",
  "SRV",
  "CAA",
  "PTR",
  "SOA",
] as const;

// ---------------------------------------------------------------------------
// Zod schemas — single source of truth
// ---------------------------------------------------------------------------

export const DnsRecordSchema = z.object({
  type: z.string().openapi({
    description: "DNS record type",
    example: "A",
  }),
  name: z.string().openapi({
    description: "Record name (e.g. @ or subdomain)",
    example: "www",
  }),
  value: z.string().openapi({
    description: "Record value",
    example: "192.168.1.1",
  }),
  ttl: z.number().openapi({
    description: "Time to live in seconds (1 = automatic for Cloudflare)",
    example: 3600,
  }),
  proxied: z.boolean().optional().openapi({
    description: "Whether the record is proxied through Cloudflare",
  }),
}).openapi("DnsRecord");

export type DnsRecord = z.infer<typeof DnsRecordSchema>;

export const DnsDomainSchema = z.object({
  id: z.string().openapi({ description: "Domain ID", example: "dns_abc123" }),
  domain: z.string().openapi({
    description: "Domain name",
    example: "example.com",
  }),
  expiryDate: z.string().optional().openapi({
    description: "Domain expiry date (YYYY-MM-DD)",
    example: "2027-01-15",
  }),
  autoRenew: z.boolean().optional().openapi({
    description: "Whether auto-renew is enabled at the registrar",
  }),
  renewalCostUsd: z.number().optional().openapi({
    description: "Annual renewal cost in USD",
    example: 12.99,
  }),
  provider: z.string().optional().openapi({
    description: "DNS provider (cloudflare, manual, etc.)",
    example: "cloudflare",
  }),
  nameservers: z.array(z.string()).optional().openapi({
    description: "Nameservers for the domain",
  }),
  dnsRecords: z.array(DnsRecordSchema).optional().openapi({
    description: "DNS records synced from provider",
  }),
  status: z.string().optional().openapi({
    description: "Zone status (e.g. active, pending)",
    example: "active",
  }),
  notes: z.string().optional().openapi({
    description: "Free-form notes (markdown)",
  }),
  lastFetchedAt: z.string().optional().openapi({
    description: "ISO timestamp of last provider sync",
  }),
  project: z.string().optional().openapi({
    description: "Linked project name",
  }),
}).merge(AuditFieldsSchema).openapi("DnsDomain");

export type DnsDomain = z.infer<typeof DnsDomainSchema>;

// ---------------------------------------------------------------------------
// Create / Update — derived from DnsDomainSchema
// ---------------------------------------------------------------------------

export const CreateDnsDomainSchema = DnsDomainSchema.pick({
  domain: true,
  expiryDate: true,
  autoRenew: true,
  renewalCostUsd: true,
  provider: true,
  notes: true,
  project: true,
}).openapi("CreateDnsDomain");

export type CreateDnsDomain = z.infer<typeof CreateDnsDomainSchema>;

export const UpdateDnsDomainSchema = CreateDnsDomainSchema.partial().openapi(
  "UpdateDnsDomain",
);

export type UpdateDnsDomain = z.infer<typeof UpdateDnsDomainSchema>;

export const UpdateDnsRecordSchema = DnsRecordSchema.partial().openapi(
  "UpdateDnsRecord",
);

// ---------------------------------------------------------------------------
// Sync types — internal to provider, not exposed via OpenAPI
// ---------------------------------------------------------------------------

export type DnsSyncedFields = {
  expiryDate?: string;
  autoRenew?: boolean;
  nameservers?: string[];
  dnsRecords?: DnsRecord[];
  status?: string;
  lastFetchedAt: string;
};

export type DnsSyncResult = {
  domain: string;
  synced: DnsSyncedFields;
};

export const DnsSyncResponseSchema = z.object({
  synced: z.number().openapi({
    description: "Total domains returned by provider",
  }),
  created: z.number().openapi({
    description: "New domains created",
  }),
  updated: z.number().openapi({
    description: "Existing domains updated",
  }),
}).openapi("DnsSyncResponse");

// ---------------------------------------------------------------------------
// IDnsProvider — shared interface for DNS provider integrations
// ---------------------------------------------------------------------------

export type IDnsProvider = {
  fetchDomains(): Promise<DnsSyncResult[]>;
};

/** Loose type for raw Cloudflare API JSON responses. */
export type CfJson = Record<string, unknown>;

/** Cloudflare API response types — raw shapes from the REST API. */

export type CfAccount = { id: string; name: string };

export type CfZone = {
  id: string;
  name: string;
  status: string;
  name_servers: string[];
};

export type CfDnsRecord = {
  type: string;
  name: string;
  content: string;
  ttl: number;
  proxied?: boolean;
};

export type CfRegistrarDomain = {
  name: string;
  expires_at?: string;
  auto_renew?: boolean;
};
