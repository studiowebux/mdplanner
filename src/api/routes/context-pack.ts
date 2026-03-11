/**
 * Context-pack route.
 * GET /context-pack — single-call agent boot endpoint.
 * Returns everything an AI agent needs to start a session in one round-trip.
 */

import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { AppVariables, getParser } from "./context.ts";
import { assembleContextPack } from "../../lib/context-pack.ts";

export const contextPackRouter = new OpenAPIHono<
  { Variables: AppVariables }
>();

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const AgentSchema = z.object({
  id: z.string(),
  name: z.string(),
  agentType: z.string(),
});

const OwnerSchema = z.object({
  id: z.string(),
  name: z.string(),
});

const MilestoneInfoSchema = z.object({
  id: z.string(),
  name: z.string(),
  status: z.string(),
  description: z.string().optional(),
  target: z.string().optional(),
  taskCount: z.number(),
  doneCount: z.number(),
});

const InProgressTaskSchema = z.object({
  id: z.string(),
  title: z.string(),
  section: z.string(),
  assignee: z.string().optional(),
  milestone: z.string().optional(),
  description: z.string().openapi({
    description: "First 300 characters of the task description",
  }),
  blockedBy: z.array(z.string()),
});

const TodoTaskSchema = z.object({
  id: z.string(),
  title: z.string(),
  priority: z.number().optional(),
  tags: z.array(z.string()),
  milestone: z.string().optional(),
  ready: z.boolean().openapi({
    description: "True when all blocked_by tasks are Done or completed",
  }),
});

const NoteRefSchema = z.object({
  id: z.string(),
  title: z.string(),
  updatedAt: z.string(),
});

const ProgressExcerptSchema = z.object({
  id: z.string(),
  title: z.string(),
  updatedAt: z.string(),
  excerpt: z.string().openapi({
    description: "First 500 characters of the note content",
  }),
});

const SummarySchema = z.object({
  openMilestones: z.number(),
  totalInProgress: z.number(),
  totalTodo: z.number(),
  staleTasks: z.number().openapi({
    description: "In-progress tasks with no comment in the last 24 hours",
  }),
});

const ContextPackSchema = z
  .object({
    generatedAt: z.string(),
    project: z.string(),
    people: z.object({
      agents: z.array(AgentSchema),
      owner: OwnerSchema.nullable(),
    }),
    milestone: MilestoneInfoSchema.nullable(),
    inProgress: z.array(InProgressTaskSchema),
    todo: z.array(TodoTaskSchema).openapi({
      description: "Top 10 todo tasks sorted by priority",
    }),
    recentProgress: ProgressExcerptSchema.nullable(),
    decisions: z.array(NoteRefSchema),
    architecture: z.array(NoteRefSchema),
    constraints: z.array(NoteRefSchema),
    summary: SummarySchema,
  })
  .openapi("ContextPack");

// ---------------------------------------------------------------------------
// Route
// ---------------------------------------------------------------------------

const getContextPackRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Core"],
  summary: "Single-call agent boot endpoint",
  operationId: "getContextPack",
  description:
    "Returns everything an AI agent needs to start a session in one round-trip. " +
    "Replaces 8+ sequential MCP calls from Phase 1 Boot: people, active milestone, " +
    "in-progress tasks, top-10 todo, most recent progress note excerpt, and " +
    "decision/architecture/constraint note titles.",
  request: {
    query: z.object({
      project: z.string().optional().openapi({
        description: "Project name to scope all entities (case-insensitive)",
        example: "MD Planner",
      }),
      milestone: z.string().optional().openapi({
        description:
          "Milestone name. Defaults to the most recently created open milestone.",
        example: "v0.27.0",
      }),
    }),
  },
  responses: {
    200: {
      content: { "application/json": { schema: ContextPackSchema } },
      description: "Agent context pack",
    },
  },
});

contextPackRouter.openapi(getContextPackRoute, async (c) => {
  const parser = getParser(c);
  const { project, milestone } = c.req.valid("query");
  const pack = await assembleContextPack(parser, { project, milestone });
  return c.json(pack, 200);
});
