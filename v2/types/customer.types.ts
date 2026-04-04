/**
 * Customer types — Zod schemas (single source), inferred types.
 */

import { z } from "@hono/zod-openapi";
import { AuditFieldsSchema } from "./shared.types.ts";

// ---------------------------------------------------------------------------
// Billing address sub-schema
// ---------------------------------------------------------------------------

export const BillingAddressSchema = z.object({
  street: z.string().nullable().optional().openapi({
    description: "Street address",
    example: "789 Agency Way",
  }),
  city: z.string().nullable().optional().openapi({
    description: "City",
    example: "New York",
  }),
  state: z.string().nullable().optional().openapi({
    description: "State or province",
    example: "NY",
  }),
  postalCode: z.string().nullable().optional().openapi({
    description: "Postal / ZIP code",
    example: "10001",
  }),
  country: z.string().nullable().optional().openapi({
    description: "Country",
    example: "USA",
  }),
}).openapi("BillingAddress");

export type BillingAddress = z.infer<typeof BillingAddressSchema>;

// ---------------------------------------------------------------------------
// Zod schemas — single source of truth
// ---------------------------------------------------------------------------

export const CustomerSchema = z.object({
  id: z.string().openapi({
    description: "Customer ID",
    example: "customer_agency",
  }),
  name: z.string().openapi({
    description: "Customer name",
    example: "DevAgency Inc",
  }),
  email: z.string().nullable().optional().openapi({
    description: "Contact email address",
    example: "accounts@devagency.com",
  }),
  phone: z.string().nullable().optional().openapi({
    description: "Contact phone number",
    example: "+1-555-0300",
  }),
  company: z.string().nullable().optional().openapi({
    description: "Company or organization name",
    example: "DevAgency Inc",
  }),
  billingAddress: BillingAddressSchema.nullable().optional().openapi({
    description: "Billing address",
  }),
  notes: z.string().nullable().optional().openapi({
    description: "Customer notes (markdown)",
  }),
}).merge(AuditFieldsSchema).openapi("Customer");

export type Customer = z.infer<typeof CustomerSchema>;

// ---------------------------------------------------------------------------
// Create / Update — derived from CustomerSchema
// ---------------------------------------------------------------------------

export const CreateCustomerSchema = CustomerSchema.pick({
  name: true,
  email: true,
  phone: true,
  company: true,
  billingAddress: true,
  notes: true,
}).openapi("CreateCustomer");

export type CreateCustomer = z.infer<typeof CreateCustomerSchema>;

export const UpdateCustomerSchema = CreateCustomerSchema.partial().openapi(
  "UpdateCustomer",
);

export type UpdateCustomer = z.infer<typeof UpdateCustomerSchema>;

// ---------------------------------------------------------------------------
// Query options
// ---------------------------------------------------------------------------

export const ListCustomerOptionsSchema = z.object({
  q: z.string().optional().openapi({
    param: { name: "q", in: "query" },
    description: "Search query (matches name, email, company)",
  }),
});

export type ListCustomerOptions = z.infer<typeof ListCustomerOptionsSchema>;
