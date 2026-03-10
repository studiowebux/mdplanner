/**
 * Org Chart CRUD routes.
 * Pattern: Feature Router with CRUD operations.
 * Delegates to people registry — orgchart is a view of people data.
 */

import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import {
  AppVariables,
  cachePurge,
  cacheWriteThrough,
  getParser,
} from "../context.ts";

export const orgchartRouter = new OpenAPIHono<{ Variables: AppVariables }>();

const ErrorSchema = z.object({
  error: z.string(),
  message: z.string().optional(),
});

const idParam = z.object({
  id: z.string().openapi({ param: { name: "id", in: "path" } }),
});

const listRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["People"],
  summary: "List all org chart members",
  operationId: "listOrgChartMembers",
  responses: {
    200: {
      content: { "application/json": { schema: z.array(z.object({})) } },
      description: "List of org chart members",
    },
  },
});

const treeRoute = createRoute({
  method: "get",
  path: "/tree",
  tags: ["People"],
  summary: "Get org chart tree",
  operationId: "getOrgChartTree",
  responses: {
    200: {
      content: { "application/json": { schema: z.object({}) } },
      description: "Hierarchical tree structure",
    },
  },
});

const summaryRoute = createRoute({
  method: "get",
  path: "/summary",
  tags: ["People"],
  summary: "Get org chart summary",
  operationId: "getOrgChartSummary",
  responses: {
    200: {
      content: { "application/json": { schema: z.object({}) } },
      description: "Summary statistics",
    },
  },
});

const departmentsRoute = createRoute({
  method: "get",
  path: "/departments",
  tags: ["People"],
  summary: "List org chart departments",
  operationId: "getOrgChartDepartments",
  responses: {
    200: {
      content: { "application/json": { schema: z.array(z.string()) } },
      description: "Department list",
    },
  },
});

const getRoute = createRoute({
  method: "get",
  path: "/{id}",
  tags: ["People"],
  summary: "Get single org chart member",
  operationId: "getOrgChartMember",
  request: { params: idParam },
  responses: {
    200: {
      content: { "application/json": { schema: z.object({}) } },
      description: "Member details",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Member not found",
    },
  },
});

const reportsRoute = createRoute({
  method: "get",
  path: "/{id}/reports",
  tags: ["People"],
  summary: "Get direct reports for member",
  operationId: "getOrgChartReports",
  request: { params: idParam },
  responses: {
    200: {
      content: { "application/json": { schema: z.array(z.object({})) } },
      description: "Direct reports",
    },
  },
});

const createMemberRoute = createRoute({
  method: "post",
  path: "/",
  tags: ["People"],
  summary: "Create org chart member",
  operationId: "createOrgChartMember",
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
          }),
        },
      },
      required: true,
    },
  },
  responses: {
    201: {
      content: { "application/json": { schema: z.object({}) } },
      description: "Member created",
    },
  },
});

const updateMemberRoute = createRoute({
  method: "put",
  path: "/{id}",
  tags: ["People"],
  summary: "Update org chart member",
  operationId: "updateOrgChartMember",
  request: {
    params: idParam,
    body: {
      content: { "application/json": { schema: z.object({}).passthrough() } },
      required: true,
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: z.object({}) } },
      description: "Updated member",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Member not found",
    },
  },
});

const deleteMemberRoute = createRoute({
  method: "delete",
  path: "/{id}",
  tags: ["People"],
  summary: "Delete org chart member",
  operationId: "deleteOrgChartMember",
  request: { params: idParam },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.object({ success: z.boolean() }),
        },
      },
      description: "Member deleted",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Member not found",
    },
  },
});

orgchartRouter.openapi(listRoute, async (c) => {
  const parser = getParser(c);
  const members = await parser.readOrgChartMembers();
  return c.json(members, 200);
});

orgchartRouter.openapi(treeRoute, async (c) => {
  const parser = getParser(c);
  const tree = await parser.getOrgChartTree();
  return c.json(tree, 200);
});

orgchartRouter.openapi(summaryRoute, async (c) => {
  const parser = getParser(c);
  const summary = await parser.getOrgChartSummary();
  return c.json(summary, 200);
});

orgchartRouter.openapi(departmentsRoute, async (c) => {
  const parser = getParser(c);
  const departments = await parser.getOrgChartDepartments();
  return c.json(departments, 200);
});

orgchartRouter.openapi(getRoute, async (c) => {
  const parser = getParser(c);
  const { id } = c.req.valid("param");
  const member = await parser.readOrgChartMember(id);
  if (!member) {
    return c.json({ error: "Member not found" }, 404);
  }
  return c.json(member, 200);
});

orgchartRouter.openapi(reportsRoute, async (c) => {
  const parser = getParser(c);
  const { id } = c.req.valid("param");
  const reports = await parser.getOrgChartDirectReports(id);
  return c.json(reports, 200);
});

orgchartRouter.openapi(createMemberRoute, async (c) => {
  const parser = getParser(c);
  const body = c.req.valid("json");
  const member = await parser.addOrgChartMember(body);
  await cacheWriteThrough(c, "org_members");
  return c.json(member, 201);
});

orgchartRouter.openapi(updateMemberRoute, async (c) => {
  const parser = getParser(c);
  const { id } = c.req.valid("param");
  const body = c.req.valid("json");
  const updated = await parser.updateOrgChartMember(id, body);
  if (!updated) {
    return c.json({ error: "Member not found" }, 404);
  }
  await cacheWriteThrough(c, "org_members");
  return c.json(updated, 200);
});

orgchartRouter.openapi(deleteMemberRoute, async (c) => {
  const parser = getParser(c);
  const { id } = c.req.valid("param");
  const success = await parser.deleteOrgChartMember(id);
  if (!success) {
    return c.json({ error: "Member not found" }, 404);
  }
  cachePurge(c, "org_members", id);
  return c.json({ success: true }, 200);
});
