/**
 * Sticky Note types — Zod schemas (single source), inferred types.
 */

import { z } from "@hono/zod-openapi";
import { AuditFieldsSchema, stringArray } from "./shared.types.ts";

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
  boardId: z.string().default("default").openapi({
    description: "Board this note belongs to (default: 'default')",
    example: "default",
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
  boardId: true,
}).partial({
  color: true,
  position: true,
  size: true,
  boardId: true,
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

// ---------------------------------------------------------------------------
// Sticky Board — multi-canvas support
// ---------------------------------------------------------------------------

export const StickyBoardSchema = z.object({
  id: z.string().openapi({
    description: "Board ID",
    example: "sboard_1234567890_abcd",
  }),
  title: z.string().openapi({
    description: "Board title",
    example: "Work",
  }),
  description: z.string().optional().openapi({
    description: "Optional board description",
    example: "Work-related sticky notes",
  }),
  projects: stringArray.openapi({
    description: "Linked portfolio item IDs",
  }),
}).merge(AuditFieldsSchema).openapi("StickyBoard");

export type StickyBoard = z.infer<typeof StickyBoardSchema>;

export const CreateStickyBoardSchema = StickyBoardSchema.pick({
  title: true,
  description: true,
  projects: true,
}).partial({
  description: true,
  projects: true,
}).merge(AuditFieldsSchema.partial()).openapi("CreateStickyBoard");

export type CreateStickyBoard = z.infer<typeof CreateStickyBoardSchema>;

export const UpdateStickyBoardSchema = CreateStickyBoardSchema.partial()
  .openapi(
    "UpdateStickyBoard",
  );

export type UpdateStickyBoard = z.infer<typeof UpdateStickyBoardSchema>;

export const ListStickyBoardOptionsSchema = z.object({
  q: z.string().optional().openapi({
    param: { name: "q", in: "query" },
    description: "Search query (matches title)",
  }),
});

export type ListStickyBoardOptions = z.infer<
  typeof ListStickyBoardOptionsSchema
>;
