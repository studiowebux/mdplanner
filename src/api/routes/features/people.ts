/**
 * People Registry CRUD routes.
 * Pattern: Feature Router with CRUD operations.
 */

import { Hono } from "hono";
import {
  AppVariables,
  cachePurge,
  cacheWriteThrough,
  errorResponse,
  getParser,
  jsonResponse,
} from "../context.ts";

export const peopleRouter = new Hono<{ Variables: AppVariables }>();

// GET /people - list all people
peopleRouter.get("/", async (c) => {
  const parser = getParser(c);
  const people = await parser.readPeople();
  return jsonResponse(people);
});

// GET /people/tree - get hierarchical tree structure
peopleRouter.get("/tree", async (c) => {
  const parser = getParser(c);
  const tree = await parser.getPeopleTree();
  return jsonResponse(tree);
});

// GET /people/summary - get summary statistics
peopleRouter.get("/summary", async (c) => {
  const parser = getParser(c);
  const summary = await parser.getPeopleSummary();
  return jsonResponse(summary);
});

// GET /people/departments - list all departments
peopleRouter.get("/departments", async (c) => {
  const parser = getParser(c);
  const departments = await parser.getPeopleDepartments();
  return jsonResponse(departments);
});

// GET /people/:id - get single person
peopleRouter.get("/:id", async (c) => {
  const parser = getParser(c);
  const id = c.req.param("id");
  const person = await parser.readPerson(id);

  if (!person) {
    return errorResponse("Person not found", 404);
  }

  return jsonResponse(person);
});

// GET /people/:id/reports - get direct reports
peopleRouter.get("/:id/reports", async (c) => {
  const parser = getParser(c);
  const id = c.req.param("id");
  const reports = await parser.getPeopleDirectReports(id);
  return jsonResponse(reports);
});

// POST /people - create person
peopleRouter.post("/", async (c) => {
  const parser = getParser(c);
  const body = await c.req.json();

  const person = await parser.addPerson({
    name: body.name,
    title: body.title,
    role: body.role,
    departments: body.departments,
    reportsTo: body.reportsTo,
    email: body.email,
    phone: body.phone,
    startDate: body.startDate,
    hoursPerDay: body.hoursPerDay,
    workingDays: body.workingDays,
    notes: body.notes,
  });

  await cacheWriteThrough(c, "people");
  return jsonResponse(person, 201);
});

// PUT /people/:id - update person
peopleRouter.put("/:id", async (c) => {
  const parser = getParser(c);
  const id = c.req.param("id");
  const body = await c.req.json();

  const updated = await parser.updatePerson(id, body);

  if (!updated) {
    return errorResponse("Person not found", 404);
  }

  await cacheWriteThrough(c, "people");
  return jsonResponse(updated);
});

// DELETE /people/:id - delete person
peopleRouter.delete("/:id", async (c) => {
  const parser = getParser(c);
  const id = c.req.param("id");

  const success = await parser.deletePerson(id);

  if (!success) {
    return errorResponse("Person not found", 404);
  }

  cachePurge(c, "people", id);
  return jsonResponse({ success: true });
});
