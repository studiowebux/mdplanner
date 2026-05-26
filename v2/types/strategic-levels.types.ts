/**
 * Strategic Levels types — Zod schemas (single source), inferred types.
 * A StrategicLevelsBuilder holds a hierarchy of levels (vision → tactics).
 */

import { z } from "@hono/zod-openapi";
import { ArchiveFieldsSchema, AuditFieldsSchema } from "./shared.types.ts";

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const LEVEL_ORDER = [
  "vision",
  "mission",
  "goals",
  "objectives",
  "strategies",
  "tactics",
] as const;

export type StrategicLevelType = typeof LEVEL_ORDER[number];

// ---------------------------------------------------------------------------
// StrategicLevel — a single item within a builder
// ---------------------------------------------------------------------------

export const StrategicLevelSchema = z.object({
  id: z.string().openapi({
    description: "Level item ID",
    example: "level_abc",
  }),
  title: z.string().openapi({
    description: "Level title",
    example: "Become market leader",
  }),
  level: z.enum(LEVEL_ORDER).openapi({
    description: "Level type in the hierarchy",
    example: "vision",
  }),
  order: z.number().int().openapi({
    description: "Sort order within the level type",
  }),
}).openapi("StrategicLevel");

export type StrategicLevel = z.infer<typeof StrategicLevelSchema>;

// ---------------------------------------------------------------------------
// StrategicLevelsBuilder — the top-level document
// ---------------------------------------------------------------------------

export const StrategicLevelsBuildersSchema = z.object({
  id: z.string().openapi({
    description: "Builder ID",
    example: "strategic_abc123",
  }),
  title: z.string().openapi({
    description: "Builder title",
    example: "Company Strategy 2026",
  }),
  date: z.string().openapi({
    description: "Date (YYYY-MM-DD)",
    example: "2026-01-01",
  }),
  levels: z.array(StrategicLevelSchema).openapi({
    description: "All level items across all types",
  }),
}).merge(AuditFieldsSchema).merge(ArchiveFieldsSchema).openapi(
  "StrategicLevelsBuilder",
);

export type StrategicLevelsBuilder = z.infer<
  typeof StrategicLevelsBuildersSchema
>;

// ---------------------------------------------------------------------------
// Create / Update
// ---------------------------------------------------------------------------

export const CreateStrategicLevelsBuildersSchema = StrategicLevelsBuildersSchema
  .pick({
    title: true,
    date: true,
    levels: true,
  }).partial({
    date: true,
    levels: true,
  }).openapi("CreateStrategicLevelsBuilder");

export type CreateStrategicLevelsBuilder = z.infer<
  typeof CreateStrategicLevelsBuildersSchema
>;

export const UpdateStrategicLevelsBuildersSchema =
  CreateStrategicLevelsBuildersSchema.partial()
    .openapi("UpdateStrategicLevelsBuilder");

export type UpdateStrategicLevelsBuilder = z.infer<
  typeof UpdateStrategicLevelsBuildersSchema
>;

// ---------------------------------------------------------------------------
// Query options
// ---------------------------------------------------------------------------

export const ListStrategicLevelsOptionsSchema = z.object({
  q: z.string().optional().openapi({
    param: { name: "q", in: "query" },
    description: "Search query (matches title)",
  }),
  date: z.string().optional().openapi({
    param: { name: "date", in: "query" },
    description: "Filter by date (YYYY-MM-DD)",
  }),
});

export type ListStrategicLevelsOptions = z.infer<
  typeof ListStrategicLevelsOptionsSchema
>;
