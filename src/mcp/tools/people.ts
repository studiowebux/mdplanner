/**
 * MCP tools for people registry operations.
 * Tools: list_people, get_person, create_person, update_person, delete_person
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ProjectManager } from "../../lib/project-manager.ts";
import { err, ok } from "./utils.ts";

export function registerPeopleTools(
  server: McpServer,
  pm: ProjectManager,
): void {
  const parser = pm.getActiveParser();

  server.registerTool(
    "list_people",
    {
      description: "List all people in the project's people registry.",
      inputSchema: {
        department: z.string().optional().describe("Filter by department"),
      },
    },
    async ({ department }) => {
      const people = department
        ? await parser.getPeopleByDepartment(department)
        : await parser.readPeople();
      return ok(people);
    },
  );

  server.registerTool(
    "get_person",
    {
      description: "Get a single person by their ID.",
      inputSchema: { id: z.string().describe("Person ID") },
    },
    async ({ id }) => {
      const person = await parser.readPerson(id);
      if (!person) return err(`Person '${id}' not found`);
      return ok(person);
    },
  );

  server.registerTool(
    "create_person",
    {
      description: "Add a new person to the people registry.",
      inputSchema: {
        name: z.string().describe("Full name"),
        title: z.string().optional().describe("Job title"),
        email: z.string().optional(),
        phone: z.string().optional(),
        departments: z.array(z.string()).optional(),
        reportsTo: z.string().optional().describe(
          "Person ID of direct manager",
        ),
        startDate: z.string().optional().describe("Start date (YYYY-MM-DD)"),
        notes: z.string().optional(),
      },
    },
    async (
      { name, title, email, phone, departments, reportsTo, startDate, notes },
    ) => {
      const person = await parser.addPerson({
        name,
        ...(title && { title }),
        ...(email && { email }),
        ...(phone && { phone }),
        ...(departments?.length && { departments }),
        ...(reportsTo && { reportsTo }),
        ...(startDate && { startDate }),
        ...(notes && { notes }),
      });
      return ok({ id: person.id });
    },
  );

  server.registerTool(
    "update_person",
    {
      description: "Update an existing person's fields.",
      inputSchema: {
        id: z.string().describe("Person ID"),
        name: z.string().optional(),
        title: z.string().optional(),
        email: z.string().optional(),
        phone: z.string().optional(),
        departments: z.array(z.string()).optional(),
        reportsTo: z.string().optional(),
        startDate: z.string().optional(),
        notes: z.string().optional(),
      },
    },
    async ({ id, ...updates }) => {
      const success = await parser.updatePerson(id, updates);
      if (!success) return err(`Person '${id}' not found`);
      return ok({ success: true });
    },
  );

  server.registerTool(
    "delete_person",
    {
      description: "Delete a person from the registry by their ID.",
      inputSchema: { id: z.string().describe("Person ID") },
    },
    async ({ id }) => {
      const success = await parser.deletePerson(id);
      if (!success) return err(`Person '${id}' not found`);
      return ok({ success: true });
    },
  );
}
