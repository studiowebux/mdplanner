/**
 * Contact types — Zod schemas (single source), inferred types.
 */

import { z } from "@hono/zod-openapi";
import {
  ArchiveFieldsSchema,
  AuditFieldsSchema,
  stringArray,
} from "./shared.types.ts";

// ---------------------------------------------------------------------------
// Relationship type enum
// ---------------------------------------------------------------------------

export const ContactTypeSchema = z.enum([
  "lead",
  "customer",
  "partner",
  "vendor",
  "other",
]).openapi("ContactType");

export type ContactType = z.infer<typeof ContactTypeSchema>;

// ---------------------------------------------------------------------------
// Zod schemas — single source of truth
// ---------------------------------------------------------------------------

export const ContactSchema = z.object({
  id: z.string().openapi({
    description: "Contact ID",
    example: "contact_jane_doe",
  }),
  name: z.string().min(1).max(200).openapi({
    description: "Contact full name",
    example: "Jane Doe",
  }),
  email: z.string().nullable().optional().openapi({
    description: "Email address",
    example: "jane@example.com",
  }),
  phone: z.string().nullable().optional().openapi({
    description: "Phone number",
    example: "+1-555-0100",
  }),
  role: z.string().nullable().optional().openapi({
    description: "Job title or role at the contact's company",
    example: "Head of Marketing",
  }),
  company: z.string().nullable().optional().openapi({
    description: "Company or organization name",
    example: "Acme Corp",
  }),
  type: ContactTypeSchema.nullable().optional().openapi({
    description: "Relationship type",
    example: "lead",
  }),
  notes: z.string().nullable().optional().openapi({
    description: "Free-form notes (markdown)",
  }),
  tags: stringArray.nullable().optional().openapi({
    description: "Tags for grouping/filtering",
    example: ["vip", "q1-2026"],
  }),
}).merge(AuditFieldsSchema).merge(ArchiveFieldsSchema).openapi("Contact");

export type Contact = z.infer<typeof ContactSchema>;

// ---------------------------------------------------------------------------
// Create / Update — derived from ContactSchema
// ---------------------------------------------------------------------------

export const CreateContactSchema = ContactSchema.pick({
  name: true,
  email: true,
  phone: true,
  role: true,
  company: true,
  type: true,
  notes: true,
  tags: true,
}).openapi("CreateContact");

export type CreateContact = z.infer<typeof CreateContactSchema>;

export const UpdateContactSchema = CreateContactSchema.partial().openapi(
  "UpdateContact",
);

export type UpdateContact = z.infer<typeof UpdateContactSchema>;

// ---------------------------------------------------------------------------
// Query options
// ---------------------------------------------------------------------------

export const ListContactOptionsSchema = z.object({
  q: z.string().optional().openapi({
    param: { name: "q", in: "query" },
    description: "Search query (matches name, email, role, company, notes)",
  }),
  type: ContactTypeSchema.optional().openapi({
    param: { name: "type", in: "query" },
    description: "Filter by relationship type",
  }),
  company: z.string().optional().openapi({
    param: { name: "company", in: "query" },
    description: "Filter by company (case-insensitive exact match)",
  }),
});

export type ListContactOptions = z.infer<typeof ListContactOptionsSchema>;
