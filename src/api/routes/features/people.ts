/**
 * People Registry CRUD routes.
 * Pattern: Feature Router with CRUD operations.
 */

import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import {
  AppVariables,
  cachePurge,
  cacheWriteThrough,
  getParser,
} from "../context.ts";

export const peopleRouter = new OpenAPIHono<{ Variables: AppVariables }>();

const ErrorSchema = z.object({
  error: z.string(),
  message: z.string().optional(),
});

const idParam = z.object({
  id: z.string().openapi({ param: { name: "id", in: "path" } }),
});

const listPeopleRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["People"],
  summary: "List all people",
  operationId: "listPeople",
  responses: {
    200: {
      content: { "application/json": { schema: z.array(z.object({})) } },
      description: "List of people",
    },
  },
});

const getTreeRoute = createRoute({
  method: "get",
  path: "/tree",
  tags: ["People"],
  summary: "Get hierarchical people tree",
  operationId: "getPeopleTree",
  responses: {
    200: {
      content: { "application/json": { schema: z.object({}) } },
      description: "Hierarchical tree structure",
    },
  },
});

const getSummaryRoute = createRoute({
  method: "get",
  path: "/summary",
  tags: ["People"],
  summary: "Get summary statistics",
  operationId: "getPeopleSummary",
  responses: {
    200: {
      content: { "application/json": { schema: z.object({}) } },
      description: "People summary stats",
    },
  },
});

const getDepartmentsRoute = createRoute({
  method: "get",
  path: "/departments",
  tags: ["People"],
  summary: "List all departments",
  operationId: "getPeopleDepartments",
  responses: {
    200: {
      content: { "application/json": { schema: z.array(z.string()) } },
      description: "Department list",
    },
  },
});

const getPersonRoute = createRoute({
  method: "get",
  path: "/{id}",
  tags: ["People"],
  summary: "Get single person",
  operationId: "getPerson",
  request: { params: idParam },
  responses: {
    200: {
      content: { "application/json": { schema: z.object({}) } },
      description: "Person details",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Person not found",
    },
  },
});

const getReportsRoute = createRoute({
  method: "get",
  path: "/{id}/reports",
  tags: ["People"],
  summary: "Get direct reports",
  operationId: "getPersonReports",
  request: { params: idParam },
  responses: {
    200: {
      content: { "application/json": { schema: z.array(z.object({})) } },
      description: "Direct reports",
    },
  },
});

const createPersonRoute = createRoute({
  method: "post",
  path: "/",
  tags: ["People"],
  summary: "Create person",
  operationId: "createPerson",
  request: {
    body: {
      content: {
        "application/json": {
          schema: z.object({
            name: z.string().min(1),
            title: z.string().optional(),
            role: z.string().optional(),
            departments: z.array(z.string()).optional(),
            reportsTo: z.string().optional(),
            email: z.string().optional(),
            phone: z.string().optional(),
            startDate: z.string().optional(),
            hoursPerDay: z.number().optional(),
            workingDays: z.array(z.string()).optional(),
            notes: z.string().optional(),
            agentType: z.enum(["human", "ai"]).optional(),
            skills: z.array(z.string()).optional(),
            models: z.array(z.object({
              name: z.string(),
              provider: z.string().default(""),
              endpoint: z.string().optional(),
            })).optional(),
            systemPrompt: z.string().optional(),
          }),
        },
      },
      required: true,
    },
  },
  responses: {
    201: {
      content: { "application/json": { schema: z.object({}) } },
      description: "Person created",
    },
  },
});

const updatePersonRoute = createRoute({
  method: "put",
  path: "/{id}",
  tags: ["People"],
  summary: "Update person",
  operationId: "updatePerson",
  request: {
    params: idParam,
    body: {
      content: { "application/json": { schema: z.any() } },
      required: true,
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: z.object({}) } },
      description: "Updated person",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Person not found",
    },
  },
});

const heartbeatRoute = createRoute({
  method: "post",
  path: "/{id}/heartbeat",
  tags: ["People"],
  summary: "Update agent lastSeen timestamp",
  operationId: "personHeartbeat",
  request: {
    params: idParam,
    body: {
      content: {
        "application/json": {
          schema: z.object({
            status: z.string().optional(),
            currentTaskId: z.string().nullable().optional(),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.object({ success: z.boolean() }),
        },
      },
      description: "Heartbeat recorded",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Person not found",
    },
  },
});

const deletePersonRoute = createRoute({
  method: "delete",
  path: "/{id}",
  tags: ["People"],
  summary: "Delete person",
  operationId: "deletePerson",
  request: { params: idParam },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.object({ success: z.boolean() }),
        },
      },
      description: "Person deleted",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Person not found",
    },
  },
});

peopleRouter.openapi(listPeopleRoute, async (c) => {
  const parser = getParser(c);
  const people = await parser.readPeople();
  return c.json(people, 200);
});

peopleRouter.openapi(getTreeRoute, async (c) => {
  const parser = getParser(c);
  const tree = await parser.getPeopleTree();
  return c.json(tree, 200);
});

peopleRouter.openapi(getSummaryRoute, async (c) => {
  const parser = getParser(c);
  const summary = await parser.getPeopleSummary();
  return c.json(summary, 200);
});

peopleRouter.openapi(getDepartmentsRoute, async (c) => {
  const parser = getParser(c);
  const departments = await parser.getPeopleDepartments();
  return c.json(departments, 200);
});

peopleRouter.openapi(getPersonRoute, async (c) => {
  const parser = getParser(c);
  const { id } = c.req.valid("param");
  const person = await parser.readPerson(id);
  if (!person) {
    return c.json({ error: "Person not found" }, 404);
  }
  return c.json(person, 200);
});

peopleRouter.openapi(getReportsRoute, async (c) => {
  const parser = getParser(c);
  const { id } = c.req.valid("param");
  const reports = await parser.getPeopleDirectReports(id);
  return c.json(reports, 200);
});

peopleRouter.openapi(createPersonRoute, async (c) => {
  const parser = getParser(c);
  const body = c.req.valid("json");
  const person = await parser.addPerson(body);
  await cacheWriteThrough(c, "people");
  return c.json(person, 201);
});

peopleRouter.openapi(updatePersonRoute, async (c) => {
  const parser = getParser(c);
  const { id } = c.req.valid("param");
  const body = c.req.valid("json");
  const updated = await parser.updatePerson(id, body);
  if (!updated) {
    return c.json({ error: "Person not found" }, 404);
  }
  await cacheWriteThrough(c, "people");
  return c.json(updated, 200);
});

peopleRouter.openapi(heartbeatRoute, async (c) => {
  const parser = getParser(c);
  const { id } = c.req.valid("param");
  const body = c.req.valid("json");

  const updates: Record<string, unknown> = {
    lastSeen: new Date().toISOString(),
  };
  if (body.status) updates.status = body.status;
  if (body.currentTaskId !== undefined) {
    updates.currentTaskId = body.currentTaskId || undefined;
  }

  const updated = await parser.updatePerson(id, updates);
  if (!updated) {
    return c.json({ error: "Person not found" }, 404);
  }

  cacheWriteThrough(c, "people").catch((e) =>
    console.error("[people] background cache sync failed:", e)
  );
  return c.json({ success: true }, 200);
});

peopleRouter.openapi(deletePersonRoute, async (c) => {
  const parser = getParser(c);
  const { id } = c.req.valid("param");
  const success = await parser.deletePerson(id);
  if (!success) {
    return c.json({ error: "Person not found" }, 404);
  }
  cachePurge(c, "people", id);
  return c.json({ success: true }, 200);
});
