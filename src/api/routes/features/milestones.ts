/**
 * Milestones CRUD routes.
 */

import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import {
  AppVariables,
  cachePurge,
  cacheWriteThrough,
  getParser,
} from "../context.ts";
import { Task } from "../../../lib/types.ts";

export const milestonesRouter = new OpenAPIHono<{ Variables: AppVariables }>();

// ---------------------------------------------------------------------------
// Shared schemas
// ---------------------------------------------------------------------------

const ErrorSchema = z
  .object({
    error: z.string(),
  })
  .openapi("MilestoneError");

const SuccessSchema = z
  .object({
    success: z.boolean(),
  })
  .openapi("MilestoneSuccess");

const SuccessWithIdSchema = z
  .object({
    success: z.boolean(),
    id: z.string(),
  })
  .openapi("MilestoneSuccessWithId");

const idParam = z.object({
  id: z.string().openapi({ param: { name: "id", in: "path" } }),
});

const MilestoneSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    status: z.enum(["open", "completed"]),
    target: z.string().optional(),
    description: z.string().optional(),
    project: z.string().optional(),
    completedAt: z.string().optional(),
    taskCount: z.number(),
    completedCount: z.number(),
    progress: z.number().min(0).max(100),
  })
  .openapi("Milestone");

const CreateMilestoneSchema = z
  .object({
    name: z.string().min(1).openapi({ description: "Milestone name" }),
    target: z.string().optional().openapi({
      description: "Target date (YYYY-MM-DD)",
    }),
    status: z.enum(["open", "completed"]).default("open").openapi({
      description: "Milestone status",
    }),
    description: z.string().optional().openapi({
      description: "Optional description",
    }),
    project: z.string().optional().openapi({
      description: "Project filter scope",
    }),
  })
  .openapi("CreateMilestone");

const UpdateMilestoneSchema = z
  .object({
    name: z.string().min(1).optional().openapi({
      description: "Milestone name",
    }),
    target: z.string().nullable().optional().openapi({
      description: "Target date (YYYY-MM-DD)",
    }),
    status: z.enum(["open", "completed"]).optional().openapi({
      description: "Milestone status",
    }),
    description: z.string().nullable().optional().openapi({
      description: "Optional description",
    }),
    project: z.string().nullable().optional().openapi({
      description: "Project filter scope",
    }),
  })
  .openapi("UpdateMilestone");

// ---------------------------------------------------------------------------
// Route definitions
// ---------------------------------------------------------------------------

const listRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Milestones"],
  summary: "List milestones with progress",
  operationId: "listMilestones",
  responses: {
    200: {
      content: { "application/json": { schema: z.array(MilestoneSchema) } },
      description:
        "List of milestones including virtual entries inferred from task references",
    },
  },
});

const createRoute_ = createRoute({
  method: "post",
  path: "/",
  tags: ["Milestones"],
  summary: "Create a milestone",
  operationId: "createMilestone",
  request: {
    body: {
      content: { "application/json": { schema: CreateMilestoneSchema } },
      required: true,
    },
  },
  responses: {
    201: {
      content: { "application/json": { schema: SuccessWithIdSchema } },
      description: "Milestone created",
    },
    409: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Duplicate milestone name",
    },
  },
});

const updateRoute = createRoute({
  method: "put",
  path: "/{id}",
  tags: ["Milestones"],
  summary: "Update a milestone",
  operationId: "updateMilestone",
  request: {
    params: idParam,
    body: {
      content: { "application/json": { schema: UpdateMilestoneSchema } },
      required: true,
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: SuccessSchema } },
      description: "Milestone updated",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Milestone not found",
    },
  },
});

const deleteRoute = createRoute({
  method: "delete",
  path: "/{id}",
  tags: ["Milestones"],
  summary: "Delete a milestone",
  operationId: "deleteMilestone",
  request: {
    params: idParam,
  },
  responses: {
    200: {
      content: { "application/json": { schema: SuccessSchema } },
      description: "Milestone deleted",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Milestone not found",
    },
  },
});

// ---------------------------------------------------------------------------
// Summary schemas + route
// ---------------------------------------------------------------------------

const TaskStubSchema = z.object({
  id: z.string(),
  title: z.string(),
  tags: z.array(z.string()),
}).openapi("MilestoneTaskStub");

const MilestoneSummarySchema = z.object({
  milestone: z.string(),
  id: z.string(),
  status: z.enum(["open", "completed"]),
  description: z.string().optional(),
  target: z.string().optional(),
  totalOpen: z.number(),
  totalDone: z.number(),
  completionPct: z.number().min(0).max(100),
  sections: z.record(z.string(), z.array(TaskStubSchema)),
}).openapi("MilestoneSummary");

const nameParam = z.object({
  name: z.string().openapi({ param: { name: "name", in: "path" } }),
});

const summaryRoute = createRoute({
  method: "get",
  path: "/{name}/summary",
  tags: ["Milestones"],
  summary: "Get milestone summary with tasks grouped by section",
  operationId: "getMilestoneSummary",
  request: {
    params: nameParam,
    query: z.object({
      project: z.string().optional().openapi({
        description: "Filter tasks by project name",
      }),
    }),
  },
  responses: {
    200: {
      content: { "application/json": { schema: MilestoneSummarySchema } },
      description: "Milestone summary with tasks grouped by section",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Milestone not found",
    },
  },
});

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function flattenTasks(tasks: Task[]): Task[] {
  const result: Task[] = [];
  for (const task of tasks) {
    result.push(task);
    if (task.children?.length) {
      result.push(...flattenTasks(task.children));
    }
  }
  return result;
}

function getTasksByMilestone(tasks: Task[], milestone: string): Task[] {
  const result: Task[] = [];
  const collect = (taskList: Task[]) => {
    for (const task of taskList) {
      if (task.config.milestone === milestone) result.push(task);
      if (task.children) collect(task.children);
    }
  };
  collect(tasks);
  return result;
}

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

// GET /milestones - list all milestones with progress, including names inferred from tasks
milestonesRouter.openapi(listRoute, async (c) => {
  const parser = getParser(c);
  const [milestones, tasks] = await Promise.all([
    parser.readMilestones(),
    parser.readTasks(),
  ]);

  const result = milestones.map((m) => {
    const linkedTasks = getTasksByMilestone(tasks, m.name);
    const completedCount = linkedTasks.filter((t) => t.completed).length;
    return {
      ...m,
      taskCount: linkedTasks.length,
      completedCount,
      progress: linkedTasks.length > 0
        ? Math.round((completedCount / linkedTasks.length) * 100)
        : 0,
    };
  });

  // Surface milestone names referenced in tasks but with no backing file,
  // as virtual (read-only) entries — without writing any files.
  // Writing files in GET caused race-condition duplicates on concurrent requests.
  const existingNames = new Set(milestones.map((m) => m.name));
  const collectNames = (taskList: Task[]) => {
    for (const task of taskList) {
      if (task.config.milestone && !existingNames.has(task.config.milestone)) {
        const name = task.config.milestone;
        existingNames.add(name); // prevent duplicates across sibling calls
        const linkedTasks = getTasksByMilestone(tasks, name);
        const completedCount = linkedTasks.filter((t) => t.completed).length;
        result.push({
          id: name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(
            /^-|-$/g,
            "",
          ),
          name,
          status: "open" as const,
          taskCount: linkedTasks.length,
          completedCount,
          progress: linkedTasks.length > 0
            ? Math.round((completedCount / linkedTasks.length) * 100)
            : 0,
        });
      }
      if (task.children) collectNames(task.children);
    }
  };
  collectNames(tasks);

  return c.json(result, 200);
});

// GET /milestones/:name/summary - milestone summary with tasks grouped by section
milestonesRouter.openapi(summaryRoute, async (c) => {
  const parser = getParser(c);
  const { name } = c.req.valid("param");
  const { project } = c.req.valid("query");

  const milestones = await parser.readMilestones();
  const m = milestones.find(
    (ms) => ms.name.toLowerCase() === name.toLowerCase(),
  );
  if (!m) return c.json({ error: `Milestone '${name}' not found` }, 404);

  const tasks = await parser.readTasks();
  let flat = flattenTasks(tasks);

  flat = flat.filter(
    (t) => (t.config?.milestone ?? "").toLowerCase() === name.toLowerCase(),
  );
  if (project) {
    flat = flat.filter(
      (t) => (t.config?.project ?? "").toLowerCase() === project.toLowerCase(),
    );
  }

  const sectionOrder = ["In Progress", "Pending Review", "Todo", "Done"];
  const sections: Record<
    string,
    { id: string; title: string; tags: string[] }[]
  > = {};
  for (const sec of sectionOrder) {
    sections[sec] = [];
  }
  for (const t of flat) {
    const sec = t.section;
    if (!sections[sec]) sections[sec] = [];
    sections[sec].push({
      id: t.id,
      title: t.title,
      tags: t.config?.tags ?? [],
    });
  }

  const totalDone = sections["Done"].length;
  const totalOpen = flat.length - totalDone;
  const completionPct = flat.length > 0
    ? Math.round((totalDone / flat.length) * 100)
    : 0;

  return c.json(
    {
      milestone: m.name,
      id: m.id,
      status: m.status,
      description: m.description,
      target: m.target,
      totalOpen,
      totalDone,
      completionPct,
      sections,
    },
    200,
  );
});

// POST /milestones - create milestone
milestonesRouter.openapi(createRoute_, async (c) => {
  const parser = getParser(c);
  const body = c.req.valid("json");
  const milestones = await parser.readMilestones();

  // Prevent duplicate name (optionally scoped to project)
  const duplicate = body.project
    ? milestones.find(
      (m) => m.name === body.name && m.project === body.project,
    )
    : milestones.find((m) => m.name === body.name);
  if (duplicate) {
    return c.json(
      {
        error: body.project
          ? `Milestone '${body.name}' already exists for project '${body.project}'`
          : `Milestone '${body.name}' already exists`,
      },
      409,
    );
  }

  const created = await parser.addMilestone({
    name: body.name,
    target: body.target,
    status: body.status || "open",
    description: body.description,
    project: body.project,
  });
  await cacheWriteThrough(c, "milestones");
  return c.json({ success: true, id: created.id }, 201);
});

// PUT /milestones/:id - update milestone
milestonesRouter.openapi(updateRoute, async (c) => {
  const parser = getParser(c);
  const { id } = c.req.valid("param");
  const body = c.req.valid("json");
  const milestones = await parser.readMilestones();
  const index = milestones.findIndex((m) => m.id === id);
  if (index === -1) return c.json({ error: "Not found" }, 404);

  const existing = milestones[index];
  // Coerce null values to undefined so they clear the field without violating the type
  const cleaned: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(body)) {
    if (v !== undefined) cleaned[k] = v === null ? undefined : v;
  }
  const merged = { ...existing, ...cleaned };

  // Auto-manage completedAt: set when transitioning to completed, clear otherwise
  if (body.status === "completed" && !existing.completedAt) {
    merged.completedAt = new Date().toISOString().split("T")[0];
  } else if (body.status && body.status !== "completed") {
    delete merged.completedAt;
  }

  milestones[index] = merged;
  await parser.saveMilestones(milestones);
  await cacheWriteThrough(c, "milestones");
  return c.json({ success: true }, 200);
});

// DELETE /milestones/:id - delete milestone
milestonesRouter.openapi(deleteRoute, async (c) => {
  const parser = getParser(c);
  const { id } = c.req.valid("param");
  const deleted = await parser.deleteMilestone(id);
  if (!deleted) return c.json({ error: "Not found" }, 404);
  cachePurge(c, "milestones", id);
  return c.json({ success: true }, 200);
});
