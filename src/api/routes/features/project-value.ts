/**
 * Project Value Board CRUD routes.
 */

import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import {
  AppVariables,
  cachePurge,
  cacheWriteThrough,
  getParser,
} from "../context.ts";

export const projectValueRouter = new OpenAPIHono<{
  Variables: AppVariables;
}>();

const ErrorSchema = z.object({
  error: z.string(),
  message: z.string().optional(),
});
const idParam = z.object({
  id: z.string().openapi({ param: { name: "id", in: "path" } }),
});
const SuccessSchema = z.object({ success: z.boolean() });

const listProjectValueRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Project Value"],
  summary: "List all project value boards",
  operationId: "listProjectValueBoards",
  responses: {
    200: {
      content: { "application/json": { schema: z.array(z.any()) } },
      description: "List of project value boards",
    },
  },
});

const createProjectValueRoute = createRoute({
  method: "post",
  path: "/",
  tags: ["Project Value"],
  summary: "Create project value board",
  operationId: "createProjectValueBoard",
  request: {
    body: {
      content: {
        "application/json": { schema: z.any() },
      },
      required: true,
    },
  },
  responses: {
    201: {
      content: { "application/json": { schema: z.any() } },
      description: "Project value board created",
    },
  },
});

const updateProjectValueRoute = createRoute({
  method: "put",
  path: "/{id}",
  tags: ["Project Value"],
  summary: "Update project value board",
  operationId: "updateProjectValueBoard",
  request: {
    params: idParam,
    body: {
      content: {
        "application/json": { schema: z.any() },
      },
      required: true,
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: z.any() } },
      description: "Updated project value board",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

const deleteProjectValueRoute = createRoute({
  method: "delete",
  path: "/{id}",
  tags: ["Project Value"],
  summary: "Delete project value board",
  operationId: "deleteProjectValueBoard",
  request: { params: idParam },
  responses: {
    200: {
      content: { "application/json": { schema: SuccessSchema } },
      description: "Project value board deleted",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

// --- Handlers ---

projectValueRouter.openapi(listProjectValueRoute, async (c) => {
  const parser = getParser(c);
  const boards = await parser.readProjectValueBoards();
  return c.json(boards, 200);
});

projectValueRouter.openapi(createProjectValueRoute, async (c) => {
  const parser = getParser(c);
  const body = c.req.valid("json");
  const boards = await parser.readProjectValueBoards();
  const newBoard = {
    id: crypto.randomUUID(),
    title: body.title || "New Board",
    date: body.date || new Date().toISOString().split("T")[0],
    customerSegments: body.customerSegments || [],
    problem: body.problem || [],
    solution: body.solution || [],
    benefit: body.benefit || [],
  };
  boards.push(newBoard);
  await parser.saveProjectValueBoards(boards);
  await cacheWriteThrough(c, "project_value");
  return c.json(newBoard, 201);
});

projectValueRouter.openapi(updateProjectValueRoute, async (c) => {
  const parser = getParser(c);
  const { id } = c.req.valid("param");
  const body = c.req.valid("json");
  const boards = await parser.readProjectValueBoards();
  const index = boards.findIndex((b) => b.id === id);
  if (index === -1) return c.json({ error: "Not found" }, 404);
  boards[index] = { ...boards[index], ...body };
  await parser.saveProjectValueBoards(boards);
  await cacheWriteThrough(c, "project_value");
  return c.json(boards[index], 200);
});

projectValueRouter.openapi(deleteProjectValueRoute, async (c) => {
  const parser = getParser(c);
  const { id } = c.req.valid("param");
  const boards = await parser.readProjectValueBoards();
  const filtered = boards.filter((b) => b.id !== id);
  if (filtered.length === boards.length) {
    return c.json({ error: "Not found" }, 404);
  }
  await parser.saveProjectValueBoards(filtered);
  cachePurge(c, "project_value", id);
  return c.json({ success: true }, 200);
});
