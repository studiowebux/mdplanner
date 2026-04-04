import { z } from "@hono/zod-openapi";
import { AuditFieldsSchema } from "./shared.types.ts";

// ---------------------------------------------------------------------------
// Paragraph types — text blocks and code fences
// ---------------------------------------------------------------------------

export const PARAGRAPH_TYPES = ["text", "code"] as const;

export const NoteParagraphSchema = z.object({
  id: z.string().openapi({ description: "Paragraph ID" }),
  type: z.enum(PARAGRAPH_TYPES).openapi({
    description: "Block type — text (markdown) or code (fenced)",
  }),
  content: z.string().openapi({ description: "Block content" }),
  language: z.string().optional().openapi({
    description: "Code fence language (only for type: code)",
  }),
  order: z.number().openapi({
    description: "Position within its parent (paragraph list or section)",
  }),
  globalOrder: z.number().optional().openapi({
    description: "Position in the combined paragraph + section render order. " +
      "Used to interleave blocks in the enhanced view.",
  }),
  metadata: z.object({
    collapsed: z.boolean().optional().openapi({
      description: "Whether the block is collapsed in the editor",
    }),
    readonly: z.boolean().optional().openapi({
      description: "Whether the block is read-only",
    }),
    tags: z.array(z.string()).optional().openapi({
      description: "Block-level tags for filtering or categorization",
    }),
  }).optional().openapi({ description: "Optional block metadata" }),
}).openapi("NoteParagraph");

export type NoteParagraph = z.infer<typeof NoteParagraphSchema>;

// ---------------------------------------------------------------------------
// Custom section types — tabs, timeline, split-view
// ---------------------------------------------------------------------------

export const CUSTOM_SECTION_TYPES = [
  "tabs",
  "timeline",
  "split-view",
] as const;

export const TIMELINE_STATUSES = ["success", "failed", "pending"] as const;

export const TabItemSchema = z.object({
  id: z.string().openapi({ description: "Tab ID" }),
  title: z.string().openapi({ description: "Tab label" }),
  content: z.array(NoteParagraphSchema).openapi({
    description: "Content blocks within this tab",
  }),
}).openapi("TabItem");

export const TimelineItemSchema = z.object({
  id: z.string().openapi({ description: "Timeline item ID" }),
  title: z.string().openapi({ description: "Timeline item title" }),
  status: z.enum(TIMELINE_STATUSES).openapi({
    description: "Item status indicator",
  }),
  date: z.string().optional().openapi({
    description: "Date associated with this item (YYYY-MM-DD)",
  }),
  content: z.array(NoteParagraphSchema).openapi({
    description: "Content blocks within this timeline item",
  }),
}).openapi("TimelineItem");

export const SplitViewSchema = z.object({
  columns: z.array(z.array(NoteParagraphSchema)).openapi({
    description: "Array of columns, each containing content blocks",
  }),
}).openapi("SplitView");

export const CustomSectionSchema = z.object({
  id: z.string().openapi({ description: "Section ID" }),
  type: z.enum(CUSTOM_SECTION_TYPES).openapi({
    description: "Section layout type",
  }),
  title: z.string().openapi({ description: "Section heading" }),
  order: z.number().openapi({
    description: "Position within the sections list",
  }),
  globalOrder: z.number().optional().openapi({
    description: "Position in the combined paragraph + section render order",
  }),
  config: z.object({
    tabs: z.array(TabItemSchema).optional().openapi({
      description: "Tab definitions (only for type: tabs)",
    }),
    timeline: z.array(TimelineItemSchema).optional().openapi({
      description: "Timeline items (only for type: timeline)",
    }),
    splitView: SplitViewSchema.optional().openapi({
      description: "Column layout (only for type: split-view)",
    }),
  }).openapi({ description: "Type-specific section configuration" }),
}).openapi("CustomSection");

export type CustomSection = z.infer<typeof CustomSectionSchema>;

// ---------------------------------------------------------------------------
// Note — always enhanced (paragraphs + custom sections)
// ---------------------------------------------------------------------------

export const NoteSchema = z.object({
  id: z.string().openapi({
    description: "Note ID",
    example: "note_1774133934235_4tb2",
  }),
  title: z.string().openapi({
    description: "Note title",
    example: "[decision] MD Planner — SSE event naming",
  }),
  content: z.string().openapi({
    description: "Raw markdown content (backward compat for simple notes)",
  }),
  paragraphs: z.array(NoteParagraphSchema).nullable().optional().openapi({
    description: "Structured content blocks",
  }),
  customSections: z.array(CustomSectionSchema).nullable().optional().openapi({
    description: "Custom layout sections — tabs, timeline, split-view",
  }),
  revision: z.number().openapi({
    description: "Monotonic counter for optimistic locking",
  }),
  project: z.string().nullable().optional().openapi({
    description: "Project scope",
    example: "MD Planner",
  }),
}).merge(AuditFieldsSchema).openapi("Note");

export type Note = z.infer<typeof NoteSchema>;

// ---------------------------------------------------------------------------
// Create — input for POST
// ---------------------------------------------------------------------------

export const CreateNoteSchema = z.object({
  title: z.string().min(1).openapi({
    description: "Note title",
    example: "[architecture] MD Planner — SSR component pattern",
  }),
  content: z.string().default("").openapi({
    description: "Raw markdown content",
  }),
  paragraphs: z.array(NoteParagraphSchema).nullable().optional().openapi({
    description: "Structured content blocks",
  }),
  customSections: z.array(CustomSectionSchema).nullable().optional().openapi({
    description: "Custom layout sections",
  }),
  project: z.string().nullable().optional().openapi({
    description: "Project scope",
    example: "MD Planner",
  }),
}).openapi("CreateNote");

export type CreateNote = z.infer<typeof CreateNoteSchema>;

// ---------------------------------------------------------------------------
// Update — derived from Create, all fields optional + nullable for clearing
// ---------------------------------------------------------------------------

export const UpdateNoteSchema = CreateNoteSchema
  .partial()
  .extend({
    paragraphs: z.array(NoteParagraphSchema).nullable().optional().openapi({
      description: "Structured content blocks. Set to null to clear.",
    }),
    customSections: z.array(CustomSectionSchema).nullable().optional().openapi({
      description: "Custom layout sections. Set to null to clear.",
    }),
    project: z.string().nullable().optional().openapi({
      description: "Project scope. Set to null to clear.",
    }),
    updatedAt: z.string().nullable().optional().openapi({
      description: "Expected updatedAt for optimistic locking. " +
        "Reject if mismatch (stale update).",
    }),
  })
  .openapi("UpdateNote");

export type UpdateNote = z.infer<typeof UpdateNoteSchema>;

// ---------------------------------------------------------------------------
// List filter — query options for listing notes
// ---------------------------------------------------------------------------

export const ListNoteOptionsSchema = z.object({
  search: z.string().optional().openapi({
    description: "Filter by title (case-insensitive substring match)",
  }),
  project: z.string().optional().openapi({
    description: "Filter by project name (case-insensitive)",
  }),
}).openapi("ListNoteOptions");

export type ListNoteOptions = z.infer<typeof ListNoteOptionsSchema>;
