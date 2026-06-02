// Project Value Board API routes — OpenAPI CRUD endpoints.

import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { getProjectValueBoardService } from "../../../singletons/services.ts";
import { publish } from "../../../singletons/event-bus.ts";
import {
  CreateProjectValueBoardSchema,
  ListProjectValueBoardOptionsSchema,
  ProjectValueBoardSchema,
  UpdateProjectValueBoardSchema,
} from "../../../types/project-value-board.types.ts";
import {
  IdParam,
  jsonContent,
  notFound,
  notFoundContent,
} from "../../../types/api.ts";

export const projectValueBoardApiRouter = new OpenAPIHono();

// GET /
const listRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["ProjectValueBoard"],
  summary: "List all project value boards",
  operationId: "listProjectValueBoards",
  request: { query: ListProjectValueBoardOptionsSchema },
  responses: {
    200: jsonContent(
      z.array(ProjectValueBoardSchema),
      "List of project value boards",
    ),
  },
});

projectValueBoardApiRouter.openapi(listRoute, async (c) => {
  const { q, project } = c.req.valid("query");
  const items = await getProjectValueBoardService().list({ q, project });
  return c.json(items, 200);
});

// GET /{id}
const getRoute = createRoute({
  method: "get",
  path: "/{id}",
  tags: ["ProjectValueBoard"],
  summary: "Get project value board by ID",
  operationId: "getProjectValueBoard",
  request: { params: IdParam },
  responses: {
    200: jsonContent(ProjectValueBoardSchema, "Project value board"),
    404: notFoundContent,
  },
});

projectValueBoardApiRouter.openapi(getRoute, async (c) => {
  const { id } = c.req.valid("param");
  const item = await getProjectValueBoardService().getById(id);
  if (!item) return c.json(notFound("ProjectValueBoard", id), 404);
  return c.json(item, 200);
});

// POST /
const createRoute_ = createRoute({
  method: "post",
  path: "/",
  tags: ["ProjectValueBoard"],
  summary: "Create a project value board",
  operationId: "createProjectValueBoard",
  request: {
    body: {
      content: {
        "application/json": { schema: CreateProjectValueBoardSchema },
      },
      required: true,
    },
  },
  responses: {
    201: jsonContent(ProjectValueBoardSchema, "Created project value board"),
  },
});

projectValueBoardApiRouter.openapi(createRoute_, async (c) => {
  const data = c.req.valid("json");
  const item = await getProjectValueBoardService().create(data);
  publish("project-value-board.created");
  return c.json(item, 201);
});

// PUT /{id}
const updateRoute = createRoute({
  method: "put",
  path: "/{id}",
  tags: ["ProjectValueBoard"],
  summary: "Update a project value board",
  operationId: "updateProjectValueBoard",
  request: {
    params: IdParam,
    body: {
      content: {
        "application/json": { schema: UpdateProjectValueBoardSchema },
      },
      required: true,
    },
  },
  responses: {
    200: jsonContent(ProjectValueBoardSchema, "Updated project value board"),
    404: notFoundContent,
  },
});

projectValueBoardApiRouter.openapi(updateRoute, async (c) => {
  const { id } = c.req.valid("param");
  const data = c.req.valid("json");
  const item = await getProjectValueBoardService().update(id, data);
  if (!item) return c.json(notFound("ProjectValueBoard", id), 404);
  publish("project-value-board.updated");
  return c.json(item, 200);
});

// DELETE /{id}
const deleteRoute = createRoute({
  method: "delete",
  path: "/{id}",
  tags: ["ProjectValueBoard"],
  summary: "Delete a project value board",
  operationId: "deleteProjectValueBoard",
  request: { params: IdParam },
  responses: {
    204: { description: "Deleted" },
    404: notFoundContent,
  },
});

projectValueBoardApiRouter.openapi(deleteRoute, async (c) => {
  const { id } = c.req.valid("param");
  const ok = await getProjectValueBoardService().delete(id);
  if (!ok) return c.json(notFound("ProjectValueBoard", id), 404);
  publish("project-value-board.deleted");
  return new Response(null, { status: 204 });
});
