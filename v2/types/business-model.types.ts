/**
 * Business Model Canvas types — Zod schemas (single source), inferred types.
 */

import { z } from "@hono/zod-openapi";
import { AuditFieldsSchema, stringArray } from "./shared.types.ts";

// ---------------------------------------------------------------------------
// Zod schemas — single source of truth
// ---------------------------------------------------------------------------

export const BusinessModelSchema = z.object({
  id: z.string().openapi({
    description: "Business Model Canvas ID",
    example: "bmc_1740700001000_abc123",
  }),
  title: z.string().openapi({
    description: "Canvas title",
    example: "MDPlanner Business Model",
  }),
  date: z.string().openapi({
    description: "Canvas date (YYYY-MM-DD)",
    example: "2026-01-15",
  }),
  keyPartners: stringArray.openapi({ description: "Key Partners" }),
  keyActivities: stringArray.openapi({ description: "Key Activities" }),
  keyResources: stringArray.openapi({ description: "Key Resources" }),
  valueProposition: stringArray.openapi({ description: "Value Proposition" }),
  customerRelationships: stringArray.openapi({
    description: "Customer Relationships",
  }),
  channels: stringArray.openapi({ description: "Channels" }),
  customerSegments: stringArray.openapi({ description: "Customer Segments" }),
  costStructure: stringArray.openapi({ description: "Cost Structure" }),
  revenueStreams: stringArray.openapi({ description: "Revenue Streams" }),
  project: z.string().nullable().optional().openapi({
    description: "Linked project name",
  }),
  notes: z.string().nullable().optional().openapi({
    description: "Additional notes (markdown)",
  }),
}).merge(AuditFieldsSchema).openapi("BusinessModel");

export type BusinessModel = z.infer<typeof BusinessModelSchema>;

// ---------------------------------------------------------------------------
// Section keys
// ---------------------------------------------------------------------------

export const BUSINESS_MODEL_SECTION_KEYS = [
  "keyPartners",
  "keyActivities",
  "keyResources",
  "valueProposition",
  "customerRelationships",
  "channels",
  "customerSegments",
  "costStructure",
  "revenueStreams",
] as const;

export type BusinessModelSectionKey =
  (typeof BUSINESS_MODEL_SECTION_KEYS)[number];

// ---------------------------------------------------------------------------
// Create / Update — derived from BusinessModelSchema
// ---------------------------------------------------------------------------

export const CreateBusinessModelSchema = BusinessModelSchema.pick({
  title: true,
  date: true,
  keyPartners: true,
  keyActivities: true,
  keyResources: true,
  valueProposition: true,
  customerRelationships: true,
  channels: true,
  customerSegments: true,
  costStructure: true,
  revenueStreams: true,
  project: true,
  notes: true,
}).partial({
  date: true,
  keyPartners: true,
  keyActivities: true,
  keyResources: true,
  valueProposition: true,
  customerRelationships: true,
  channels: true,
  customerSegments: true,
  costStructure: true,
  revenueStreams: true,
}).openapi("CreateBusinessModel");

export type CreateBusinessModel = z.infer<typeof CreateBusinessModelSchema>;

export const UpdateBusinessModelSchema = CreateBusinessModelSchema.partial()
  .openapi("UpdateBusinessModel");

export type UpdateBusinessModel = z.infer<typeof UpdateBusinessModelSchema>;

// ---------------------------------------------------------------------------
// Query options
// ---------------------------------------------------------------------------

export const ListBusinessModelOptionsSchema = z.object({
  project: z.string().optional().openapi({
    param: { name: "project", in: "query" },
    description: "Filter by project name",
  }),
  q: z.string().optional().openapi({
    param: { name: "q", in: "query" },
    description: "Search query",
  }),
});

export type ListBusinessModelOptions = z.infer<
  typeof ListBusinessModelOptionsSchema
>;
