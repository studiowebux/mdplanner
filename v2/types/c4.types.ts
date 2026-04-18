/**
 * C4 Architecture types — Zod schemas (single source), inferred types.
 *
 * Storage compat with v1:
 *   - name from `# Heading` in markdown body
 *   - position: { x, y } nested object in frontmatter
 *   - connections stored as array on source component frontmatter
 */

import { z } from "@hono/zod-openapi";
import { AuditFieldsSchema, stringArray } from "./shared.types.ts";

// ---------------------------------------------------------------------------
// Level enum — used by z.enum below; UI labels/constants live in domains/c4/constants.tsx
// ---------------------------------------------------------------------------

export const C4_LEVELS = [
  "context",
  "container",
  "component",
  "code",
] as const;

export type C4Level = (typeof C4_LEVELS)[number];

// ---------------------------------------------------------------------------
// Connection — stored as array on source component
// ---------------------------------------------------------------------------

export const C4ConnectionSchema = z.object({
  id: z.string().openapi({
    description: "Connection ID",
    example: "c4conn_1234_ab12",
  }),
  target: z.string().openapi({
    description: "Target component ID",
    example: "c4_database",
  }),
  label: z.string().openapi({
    description: "Connection label",
    example: "Reads from",
  }),
  technology: z.string().nullable().optional().openapi({
    description: "Technology used on this connection",
    example: "HTTPS/JSON",
  }),
}).openapi("C4Connection");

export type C4Connection = z.infer<typeof C4ConnectionSchema>;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const C4ComponentSchema = z.object({
  id: z.string().openapi({
    description: "Component ID (c4_ prefix)",
    example: "c4_api_server",
  }),
  name: z.string().openapi({
    description: "Component name",
    example: "API Server",
  }),
  level: z.enum(C4_LEVELS).openapi({
    description: "C4 diagram level",
    example: "container",
  }),
  type: z.string().openapi({
    description:
      "Component type (e.g. Person, Software System, Service, Database)",
    example: "API Application",
  }),
  description: z.string().nullable().optional().openapi({
    description: "What this component does",
  }),
  technology: z.string().nullable().optional().openapi({
    description: "Technology stack",
    example: "Deno, TypeScript, Hono",
  }),
  position: z.object({ x: z.number(), y: z.number() }).openapi({
    description: "Canvas position in pixels",
    example: { x: 200, y: 300 },
  }),
  parent: z.string().nullable().optional().openapi({
    description: "Parent component ID for level drill-down",
  }),
  children: stringArray.optional().openapi({
    description: "Child component IDs",
  }),
  connections: z.array(C4ConnectionSchema).optional().openapi({
    description: "Outgoing connections from this component",
  }),
}).merge(AuditFieldsSchema).openapi("C4Component");

export type C4Component = z.infer<typeof C4ComponentSchema>;

// ---------------------------------------------------------------------------
// Create / Update
// ---------------------------------------------------------------------------

export const CreateC4ComponentSchema = C4ComponentSchema.pick({
  name: true,
  level: true,
  type: true,
  description: true,
  technology: true,
  position: true,
  parent: true,
}).partial({
  description: true,
  technology: true,
  position: true,
  parent: true,
}).openapi("CreateC4Component");

export type CreateC4Component = z.infer<typeof CreateC4ComponentSchema>;

export const UpdateC4ComponentSchema = CreateC4ComponentSchema.partial()
  .openapi(
    "UpdateC4Component",
  );

export type UpdateC4Component = z.infer<typeof UpdateC4ComponentSchema>;

export const PatchC4PositionSchema = z.object({
  x: z.number().openapi({
    description: "Canvas X position (px)",
    example: 400,
  }),
  y: z.number().openapi({
    description: "Canvas Y position (px)",
    example: 200,
  }),
}).openapi("PatchC4Position");

export type PatchC4Position = z.infer<typeof PatchC4PositionSchema>;

// ---------------------------------------------------------------------------
// Connection create
// ---------------------------------------------------------------------------

export const CreateC4ConnectionSchema = z.object({
  sourceId: z.string().openapi({ description: "Source component ID" }),
  targetId: z.string().openapi({ description: "Target component ID" }),
  label: z.string().openapi({
    description: "Connection label",
    example: "Reads from",
  }),
  technology: z.string().nullable().optional().openapi({
    description: "Technology used on this connection",
    example: "SQL",
  }),
}).openapi("CreateC4Connection");

export type CreateC4Connection = z.infer<typeof CreateC4ConnectionSchema>;

// ---------------------------------------------------------------------------
// Query options
// ---------------------------------------------------------------------------

export const ListC4OptionsSchema = z.object({
  level: z.enum(C4_LEVELS).optional().openapi({
    param: { name: "level", in: "query" },
    description: "Filter by C4 level",
  }),
  parent: z.string().optional().openapi({
    param: { name: "parent", in: "query" },
    description: "Filter by parent component ID",
  }),
  q: z.string().optional().openapi({
    param: { name: "q", in: "query" },
    description: "Full-text search query",
  }),
});

export type ListC4Options = z.infer<typeof ListC4OptionsSchema>;
