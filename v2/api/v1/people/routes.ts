// People CRUD routes — OpenAPIHono router consumed by api/mod.ts.

import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { getPeopleService } from "../../../singletons/services.ts";
import { publish } from "../../../singletons/event-bus.ts";
import {
  CreatePersonSchema,
  PeopleSummarySchema,
  PersonSchema,
  PersonWithChildrenSchema,
  UpdatePersonSchema,
} from "../../../types/person.types.ts";
import { ErrorSchema, IdParam } from "../../../types/api.ts";

export const peopleRouter = new OpenAPIHono();

// GET /
const listPeopleRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["People"],
  summary: "List all people",
  operationId: "listPeople",
  request: {
    query: z.object({
      department: z.string().optional().openapi({
        description: "Filter by department name",
      }),
    }),
  },
  responses: {
    200: {
      content: { "application/json": { schema: z.array(PersonSchema) } },
      description: "List of people",
    },
  },
});

peopleRouter.openapi(listPeopleRoute, async (c) => {
  try {
    const { department } = c.req.valid("query");
    const people = await getPeopleService().list(department);
    return c.json(people, 200);
  } catch (err) {
    throw err;
  }
});

// GET /tree
const getTreeRoute = createRoute({
  method: "get",
  path: "/tree",
  tags: ["People"],
  summary: "Get org chart as hierarchical tree",
  operationId: "getPeopleTree",
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.array(PersonWithChildrenSchema),
        },
      },
      description: "Org tree",
    },
  },
});

peopleRouter.openapi(getTreeRoute, async (c) => {
  try {
    const tree = await getPeopleService().getTree();
    return c.json(tree, 200);
  } catch (err) {
    throw err;
  }
});

// GET /summary
const getSummaryRoute = createRoute({
  method: "get",
  path: "/summary",
  tags: ["People"],
  summary: "Get people registry statistics",
  operationId: "getPeopleSummary",
  responses: {
    200: {
      content: { "application/json": { schema: PeopleSummarySchema } },
      description: "Summary statistics",
    },
  },
});

peopleRouter.openapi(getSummaryRoute, async (c) => {
  try {
    const summary = await getPeopleService().getSummary();
    return c.json(summary, 200);
  } catch (err) {
    throw err;
  }
});

// GET /departments
const getDepartmentsRoute = createRoute({
  method: "get",
  path: "/departments",
  tags: ["People"],
  summary: "List all unique departments",
  operationId: "getPeopleDepartments",
  responses: {
    200: {
      content: { "application/json": { schema: z.array(z.string()) } },
      description: "Department names",
    },
  },
});

peopleRouter.openapi(getDepartmentsRoute, async (c) => {
  try {
    const departments = await getPeopleService().getDepartments();
    return c.json(departments, 200);
  } catch (err) {
    throw err;
  }
});

// GET /:id
const getPersonRoute = createRoute({
  method: "get",
  path: "/{id}",
  tags: ["People"],
  summary: "Get person by ID",
  operationId: "getPerson",
  request: { params: IdParam },
  responses: {
    200: {
      content: { "application/json": { schema: PersonSchema } },
      description: "Person",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

peopleRouter.openapi(getPersonRoute, async (c) => {
  try {
    const { id } = c.req.valid("param");
    const person = await getPeopleService().getById(id);
    if (!person) {
      return c.json(
        { error: "PERSON_NOT_FOUND", message: `Person ${id} not found` },
        404,
      );
    }
    return c.json(person, 200);
  } catch (err) {
    throw err;
  }
});

// GET /:id/reports
const getReportsRoute = createRoute({
  method: "get",
  path: "/{id}/reports",
  tags: ["People"],
  summary: "Get direct reports for a person",
  operationId: "getPersonReports",
  request: { params: IdParam },
  responses: {
    200: {
      content: { "application/json": { schema: z.array(PersonSchema) } },
      description: "Direct reports",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

peopleRouter.openapi(getReportsRoute, async (c) => {
  try {
    const { id } = c.req.valid("param");
    const person = await getPeopleService().getById(id);
    if (!person) {
      return c.json(
        { error: "PERSON_NOT_FOUND", message: `Person ${id} not found` },
        404,
      );
    }
    const reports = await getPeopleService().getDirectReports(id);
    return c.json(reports, 200);
  } catch (err) {
    throw err;
  }
});

// POST /
const createPersonRoute = createRoute({
  method: "post",
  path: "/",
  tags: ["People"],
  summary: "Create a person",
  operationId: "createPerson",
  request: {
    body: {
      content: { "application/json": { schema: CreatePersonSchema } },
      required: true,
    },
  },
  responses: {
    201: {
      content: { "application/json": { schema: PersonSchema } },
      description: "Created person",
    },
  },
});

peopleRouter.openapi(createPersonRoute, async (c) => {
  try {
    const data = c.req.valid("json");
    const person = await getPeopleService().create(data);
    publish("person.created");
    return c.json(person, 201);
  } catch (err) {
    throw err;
  }
});

// PUT /:id
const updatePersonRoute = createRoute({
  method: "put",
  path: "/{id}",
  tags: ["People"],
  summary: "Update a person",
  operationId: "updatePerson",
  request: {
    params: IdParam,
    body: {
      content: { "application/json": { schema: UpdatePersonSchema } },
      required: true,
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: PersonSchema } },
      description: "Updated person",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

peopleRouter.openapi(updatePersonRoute, async (c) => {
  try {
    const { id } = c.req.valid("param");
    const data = c.req.valid("json");
    const person = await getPeopleService().update(id, data);
    if (!person) {
      return c.json(
        { error: "PERSON_NOT_FOUND", message: `Person ${id} not found` },
        404,
      );
    }
    publish("person.updated");
    return c.json(person, 200);
  } catch (err) {
    throw err;
  }
});

// DELETE /:id
const deletePersonRoute = createRoute({
  method: "delete",
  path: "/{id}",
  tags: ["People"],
  summary: "Delete a person",
  operationId: "deletePerson",
  request: { params: IdParam },
  responses: {
    204: { description: "Deleted" },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

peopleRouter.openapi(deletePersonRoute, async (c) => {
  try {
    const { id } = c.req.valid("param");
    const ok = await getPeopleService().delete(id);
    if (!ok) {
      return c.json(
        { error: "PERSON_NOT_FOUND", message: `Person ${id} not found` },
        404,
      );
    }
    publish("person.deleted");
    return new Response(null, { status: 204 });
  } catch (err) {
    throw err;
  }
});

// POST /:id/heartbeat
const heartbeatRoute = createRoute({
  method: "post",
  path: "/{id}/heartbeat",
  tags: ["People"],
  summary: "Update agent heartbeat",
  operationId: "agentHeartbeat",
  request: {
    params: IdParam,
    body: {
      content: {
        "application/json": {
          schema: z.object({
            status: z.enum(["idle", "working", "offline"]).optional().openapi({
              description: "Agent status",
            }),
            currentTaskId: z.string().nullable().optional().openapi({
              description: "Task ID being worked on. Set null to clear.",
            }),
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
      description: "Not found",
    },
  },
});

peopleRouter.openapi(heartbeatRoute, async (c) => {
  try {
    const { id } = c.req.valid("param");
    const { status, currentTaskId } = c.req.valid("json");
    const ok = await getPeopleService().heartbeat(id, status, currentTaskId);
    if (!ok) {
      return c.json(
        { error: "PERSON_NOT_FOUND", message: `Person ${id} not found` },
        404,
      );
    }
    return c.json({ success: true }, 200);
  } catch (err) {
    throw err;
  }
});
