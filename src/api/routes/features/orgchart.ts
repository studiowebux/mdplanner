/**
 * Org Chart CRUD routes.
 * Pattern: Feature Router with CRUD operations.
 */

import { Hono } from "hono";
import { AppVariables, getParser, jsonResponse, errorResponse } from "../context.ts";

export const orgchartRouter = new Hono<{ Variables: AppVariables }>();

// GET /orgchart - list all members
orgchartRouter.get("/", async (c) => {
  const parser = getParser(c);
  const members = await parser.readOrgChartMembers();
  return jsonResponse(members);
});

// GET /orgchart/tree - get hierarchical tree structure
orgchartRouter.get("/tree", async (c) => {
  const parser = getParser(c);
  const tree = await parser.getOrgChartTree();
  return jsonResponse(tree);
});

// GET /orgchart/summary - get summary statistics
orgchartRouter.get("/summary", async (c) => {
  const parser = getParser(c);
  const summary = await parser.getOrgChartSummary();
  return jsonResponse(summary);
});

// GET /orgchart/departments - list all departments
orgchartRouter.get("/departments", async (c) => {
  const parser = getParser(c);
  const departments = await parser.getOrgChartDepartments();
  return jsonResponse(departments);
});

// GET /orgchart/:id - get single member
orgchartRouter.get("/:id", async (c) => {
  const parser = getParser(c);
  const id = c.req.param("id");
  const member = await parser.readOrgChartMember(id);

  if (!member) {
    return errorResponse("Member not found", 404);
  }

  return jsonResponse(member);
});

// GET /orgchart/:id/reports - get direct reports
orgchartRouter.get("/:id/reports", async (c) => {
  const parser = getParser(c);
  const id = c.req.param("id");
  const reports = await parser.getOrgChartDirectReports(id);
  return jsonResponse(reports);
});

// POST /orgchart - create member
orgchartRouter.post("/", async (c) => {
  const parser = getParser(c);
  const body = await c.req.json();

  const member = await parser.addOrgChartMember({
    name: body.name,
    title: body.title,
    departments: body.departments || [],
    reportsTo: body.reportsTo,
    email: body.email,
    phone: body.phone,
    startDate: body.startDate,
    notes: body.notes,
  });

  return jsonResponse(member, 201);
});

// PUT /orgchart/:id - update member
orgchartRouter.put("/:id", async (c) => {
  const parser = getParser(c);
  const id = c.req.param("id");
  const body = await c.req.json();

  const updated = await parser.updateOrgChartMember(id, body);

  if (!updated) {
    return errorResponse("Member not found", 404);
  }

  return jsonResponse(updated);
});

// DELETE /orgchart/:id - delete member
orgchartRouter.delete("/:id", async (c) => {
  const parser = getParser(c);
  const id = c.req.param("id");

  const success = await parser.deleteOrgChartMember(id);

  if (!success) {
    return errorResponse("Member not found", 404);
  }

  return jsonResponse({ success: true });
});
