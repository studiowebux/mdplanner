/**
 * MCP tools for people registry operations.
 * Tools: list_people, get_person, create_person, update_person, delete_person,
 *        get_people_tree, get_people_summary, get_people_departments,
 *        get_person_reports
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
    "get_people_tree",
    {
      description:
        "Get the org chart as a hierarchical tree. Each node has a person record with a 'children' array of their direct reports.",
      inputSchema: {},
    },
    async () => ok(await parser.getPeopleTree()),
  );

  server.registerTool(
    "get_people_summary",
    {
      description:
        "Get people registry summary statistics: total headcount, breakdown by department, managers count.",
      inputSchema: {},
    },
    async () => ok(await parser.getPeopleSummary()),
  );

  server.registerTool(
    "get_people_departments",
    {
      description: "List all department names used in the people registry.",
      inputSchema: {},
    },
    async () => ok(await parser.getPeopleDepartments()),
  );

  server.registerTool(
    "get_person_reports",
    {
      description: "Get the direct reports for a given person.",
      inputSchema: { id: z.string().describe("Person ID") },
    },
    async ({ id }) => ok(await parser.getPeopleDirectReports(id)),
  );

  server.registerTool(
    "create_person",
    {
      description: "Add a new person to the people registry.",
      inputSchema: {
        name: z.string().describe("Full name"),
        title: z.string().optional().describe("Job title"),
        role: z.string().optional().describe(
          "Role within the team (e.g. 'developer', 'designer')",
        ),
        email: z.string().optional(),
        phone: z.string().optional(),
        departments: z.array(z.string()).optional(),
        reportsTo: z.string().optional().describe(
          "Person ID of direct manager",
        ),
        startDate: z.string().optional().describe("Start date (YYYY-MM-DD)"),
        hoursPerDay: z.number().optional().describe(
          "Working hours per day (used by capacity planning)",
        ),
        workingDays: z.array(z.string()).optional().describe(
          "Working days of the week (e.g. ['Mon','Tue','Wed','Thu','Fri'])",
        ),
        notes: z.string().optional(),
        agentType: z.enum(["human", "ai", "hybrid"]).optional().describe(
          "Agent type: human, ai, or hybrid",
        ),
        skills: z.array(z.string()).optional().describe(
          "Capabilities (e.g. ['go', 'typescript', 'code-review'])",
        ),
        models: z.array(z.object({
          name: z.string().describe("Model identifier"),
          provider: z.string().describe(
            "Provider name (e.g. anthropic, ollama)",
          ),
          endpoint: z.string().optional().describe(
            "Inference server URL for self-hosted models",
          ),
        })).optional().describe("AI models this agent can use"),
        systemPrompt: z.string().optional().describe(
          "Default system prompt / persona for AI agents",
        ),
      },
    },
    async (
      {
        name,
        title,
        role,
        email,
        phone,
        departments,
        reportsTo,
        startDate,
        hoursPerDay,
        workingDays,
        notes,
        agentType,
        skills,
        models,
        systemPrompt,
      },
    ) => {
      const person = await parser.addPerson({
        name,
        ...(title && { title }),
        ...(role && { role }),
        ...(email && { email }),
        ...(phone && { phone }),
        ...(departments?.length && { departments }),
        ...(reportsTo && { reportsTo }),
        ...(startDate && { startDate }),
        ...(hoursPerDay !== undefined && { hoursPerDay }),
        ...(workingDays?.length && { workingDays }),
        ...(notes && { notes }),
        ...(agentType && { agentType }),
        ...(skills?.length && { skills }),
        ...(models?.length && { models }),
        ...(systemPrompt && { systemPrompt }),
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
        role: z.string().optional(),
        email: z.string().optional(),
        phone: z.string().optional(),
        departments: z.array(z.string()).optional(),
        reportsTo: z.string().optional(),
        startDate: z.string().optional(),
        hoursPerDay: z.number().optional(),
        workingDays: z.array(z.string()).optional(),
        notes: z.string().optional(),
        agentType: z.enum(["human", "ai", "hybrid"]).optional().describe(
          "Agent type: human, ai, or hybrid",
        ),
        skills: z.array(z.string()).optional().describe(
          "Capabilities (e.g. ['go', 'typescript', 'code-review'])",
        ),
        models: z.array(z.object({
          name: z.string(),
          provider: z.string(),
          endpoint: z.string().optional(),
        })).optional().describe("AI models this agent can use"),
        systemPrompt: z.string().optional().describe(
          "Default system prompt / persona for AI agents",
        ),
        status: z.enum(["idle", "working", "offline"]).optional().describe(
          "Agent availability status",
        ),
        lastSeen: z.string().optional().describe(
          "ISO timestamp of last agent interaction (auto-set or manual)",
        ),
        currentTaskId: z.string().optional().describe(
          "Task ID the agent is currently working on",
        ),
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
