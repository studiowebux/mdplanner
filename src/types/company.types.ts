/**
 * Company types — Zod schemas (single source), inferred types.
 */

import { z } from "@hono/zod-openapi";
import {
  ArchiveFieldsSchema,
  AuditFieldsSchema,
  stringArray,
} from "./shared.types.ts";

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const CompanyTypeSchema = z.enum([
  "prospect",
  "customer",
  "partner",
  "vendor",
  "other",
]).openapi("CompanyType");

export type CompanyType = z.infer<typeof CompanyTypeSchema>;

export const CompanySizeSchema = z.enum([
  "1-10",
  "11-50",
  "51-200",
  "201-1000",
  "1000+",
]).openapi("CompanySize");

export type CompanySize = z.infer<typeof CompanySizeSchema>;

// ---------------------------------------------------------------------------
// Zod schemas — single source of truth
// ---------------------------------------------------------------------------

export const CompanySchema = z.object({
  id: z.string().openapi({
    description: "Company ID",
    example: "company_acme_corp",
  }),
  name: z.string().min(1).max(200).openapi({
    description: "Company name",
    example: "Acme Corp",
  }),
  website: z.string().nullable().optional().openapi({
    description: "Company website URL",
    example: "https://acme.example.com",
  }),
  industry: z.string().nullable().optional().openapi({
    description: "Industry or sector",
    example: "SaaS",
  }),
  size: CompanySizeSchema.nullable().optional().openapi({
    description: "Employee count range",
    example: "11-50",
  }),
  type: CompanyTypeSchema.nullable().optional().openapi({
    description: "Relationship type",
    example: "customer",
  }),
  phone: z.string().nullable().optional().openapi({
    description: "Main phone number",
    example: "+1-555-0100",
  }),
  email: z.string().nullable().optional().openapi({
    description: "Main contact email",
    example: "contact@acme.example.com",
  }),
  address: z.string().nullable().optional().openapi({
    description: "Physical address",
    example: "123 Main St, Springfield",
  }),
  notes: z.string().nullable().optional().openapi({
    description: "Free-form notes (markdown)",
  }),
  tags: stringArray.nullable().optional().openapi({
    description: "Tags for grouping/filtering",
    example: ["enterprise", "q1-2026"],
  }),
}).merge(AuditFieldsSchema).merge(ArchiveFieldsSchema).openapi("Company");

export type Company = z.infer<typeof CompanySchema>;

// ---------------------------------------------------------------------------
// Create / Update — derived from CompanySchema
// ---------------------------------------------------------------------------

export const CreateCompanySchema = CompanySchema.pick({
  name: true,
  website: true,
  industry: true,
  size: true,
  type: true,
  phone: true,
  email: true,
  address: true,
  notes: true,
  tags: true,
}).openapi("CreateCompany");

export type CreateCompany = z.infer<typeof CreateCompanySchema>;

export const UpdateCompanySchema = CreateCompanySchema.partial().openapi(
  "UpdateCompany",
);

export type UpdateCompany = z.infer<typeof UpdateCompanySchema>;

// ---------------------------------------------------------------------------
// Query options
// ---------------------------------------------------------------------------

export const ListCompanyOptionsSchema = z.object({
  q: z.string().optional().openapi({
    param: { name: "q", in: "query" },
    description:
      "Search query (matches name, industry, website, address, notes)",
  }),
  type: CompanyTypeSchema.optional().openapi({
    param: { name: "type", in: "query" },
    description: "Filter by relationship type",
  }),
  industry: z.string().optional().openapi({
    param: { name: "industry", in: "query" },
    description: "Filter by industry (case-insensitive exact match)",
  }),
});

export type ListCompanyOptions = z.infer<typeof ListCompanyOptionsSchema>;
