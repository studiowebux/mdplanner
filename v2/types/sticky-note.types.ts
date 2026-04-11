/**
 * Sticky Note types — Zod schemas (single source), inferred types.
 */

import { z } from "@hono/zod-openapi";
import { AuditFieldsSchema } from "./shared.types.ts";

// ---------------------------------------------------------------------------
// Zod schemas — single source of truth
// ---------------------------------------------------------------------------

const stickyNoteColorSchema = z.string().openapi({
  description: "Note background color",
  example: "yellow",
});

export const UpdatePositionSchema = z.object({
  x: z.number().openapi({
    description: "X coordinate in pixels",
    example: 120,
  }),
  y: z.number().openapi({ description: "Y coordinate in pixels", example: 80 }),
}).openapi("UpdatePosition");

export type UpdatePosition = z.infer<typeof UpdatePositionSchema>;

export const UpdateSizeSchema = z.object({
  width: z.number().openapi({ description: "Width in pixels", example: 200 }),
  height: z.number().openapi({ description: "Height in pixels", example: 160 }),
}).openapi("UpdateSize");

export type UpdateSize = z.infer<typeof UpdateSizeSchema>;

export const StickyNoteSchema = z.object({
  id: z.string().openapi({
    description: "Sticky note ID",
    example: "sticky_1234567890_abcd",
  }),
  content: z.string().openapi({
    description: "Note content (plain text)",
    example: "Remember to follow up with the client",
  }),
  color: stickyNoteColorSchema,
  position: UpdatePositionSchema.openapi({
    description: "Canvas position (pixels from origin)",
  }),
  size: UpdateSizeSchema.nullable().optional().openapi({
    description: "Note dimensions (pixels); null uses default 200×160",
  }),
}).merge(AuditFieldsSchema).openapi("StickyNote");

export type StickyNote = z.infer<typeof StickyNoteSchema>;

// ---------------------------------------------------------------------------
// Create / Update — derived from StickyNoteSchema
// ---------------------------------------------------------------------------

export const CreateStickyNoteSchema = StickyNoteSchema.pick({
  content: true,
  color: true,
  position: true,
  size: true,
}).partial({
  color: true,
  position: true,
  size: true,
}).merge(AuditFieldsSchema.partial()).openapi("CreateStickyNote");

export type CreateStickyNote = z.infer<typeof CreateStickyNoteSchema>;

export const UpdateStickyNoteSchema = CreateStickyNoteSchema.partial().openapi(
  "UpdateStickyNote",
);

export type UpdateStickyNote = z.infer<typeof UpdateStickyNoteSchema>;

// ---------------------------------------------------------------------------
// Query options
// ---------------------------------------------------------------------------

export const ListStickyNoteOptionsSchema = z.object({
  color: stickyNoteColorSchema.optional().openapi({
    param: { name: "color", in: "query" },
  }),
  q: z.string().optional().openapi({
    param: { name: "q", in: "query" },
    description: "Search query (matches content)",
  }),
  project: z.string().optional().openapi({
    param: { name: "project", in: "query" },
    description: "Filter by project name",
  }),
});

export type ListStickyNoteOptions = z.infer<typeof ListStickyNoteOptionsSchema>;
