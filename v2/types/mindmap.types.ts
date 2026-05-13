/**
 * Mindmap types — Zod schemas (single source), inferred types.
 * Tree stored as indented bullet-list markdown in the file body.
 */

import { z } from "@hono/zod-openapi";
import { AuditFieldsSchema } from "./shared.types.ts";

// ---------------------------------------------------------------------------
// Recursive node — Zod lazy schema
// ---------------------------------------------------------------------------

export type MindmapNode = {
  text: string;
  children: MindmapNode[];
};

function isMindmapNode(v: unknown): v is MindmapNode {
  if (typeof v !== "object" || v === null) return false;
  const o = v as Record<string, unknown>;
  return typeof o.text === "string" &&
    Array.isArray(o.children) &&
    (o.children as unknown[]).every(isMindmapNode);
}

// Recursive schema via `z.custom` — sidesteps `@hono/zod-openapi`'s inability
// to introspect `ZodLazy`. Runtime validation handled by `isMindmapNode`;
// OpenAPI shape declared explicitly with `$ref` self-recursion.
const MindmapNodeSchema: z.ZodType<MindmapNode> = z.custom<MindmapNode>(
  isMindmapNode,
  { message: "Invalid mindmap node" },
).openapi("MindmapNode", {
  type: "object",
  properties: {
    text: { type: "string" },
    children: {
      type: "array",
      items: { $ref: "#/components/schemas/MindmapNode" },
    },
  },
  required: ["text", "children"],
});

export { MindmapNodeSchema };

// ---------------------------------------------------------------------------
// Mindmap schema
// ---------------------------------------------------------------------------

export const MindmapSchema = z.object({
  id: z.string().openapi({
    description: "Mindmap ID",
    example: "mindmap_features",
  }),
  title: z.string().min(1).max(200).openapi({
    description: "Mindmap title",
    example: "Product Feature Map",
  }),
  nodes: z.array(MindmapNodeSchema).openapi({
    description: "Root-level nodes of the mindmap tree",
  }),
  project: z.string().min(1).openapi({
    description: "Linked project name",
  }),
  notes: z.string().nullable().optional().openapi({
    description: "Additional notes (markdown)",
  }),
}).merge(AuditFieldsSchema).openapi("Mindmap");

export type Mindmap = z.infer<typeof MindmapSchema>;

// ---------------------------------------------------------------------------
// Create / Update
// ---------------------------------------------------------------------------

export const CreateMindmapSchema = MindmapSchema.pick({
  title: true,
  nodes: true,
  project: true,
  notes: true,
}).partial({
  nodes: true,
}).openapi("CreateMindmap");

export type CreateMindmap = z.infer<typeof CreateMindmapSchema>;

export const UpdateMindmapSchema = CreateMindmapSchema.partial().openapi(
  "UpdateMindmap",
);

export type UpdateMindmap = z.infer<typeof UpdateMindmapSchema>;

// ---------------------------------------------------------------------------
// Query options
// ---------------------------------------------------------------------------

export const ListMindmapOptionsSchema = z.object({
  project: z.string().optional().openapi({
    param: { name: "project", in: "query" },
    description: "Filter by project name",
  }),
  q: z.string().optional().openapi({
    param: { name: "q", in: "query" },
    description: "Search query (matches title and node text)",
  }),
});

export type ListMindmapOptions = z.infer<typeof ListMindmapOptionsSchema>;
