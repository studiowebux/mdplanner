// MCP tools for people registry operations — thin wrappers over PeopleService.
// All Zod schemas derived from types/person.types.ts — single source of truth.

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getPeopleService } from "../../singletons/services.ts";
import {
  CreatePersonSchema,
  FindPersonForSkillsSchema,
  GetPeopleAvailabilitySchema,
  HeartbeatInputSchema,
  ListPeopleBySkillSchema,
  ListPeopleOptionsSchema,
  PersonSchema,
  PersonWorkloadSchema,
  UpdatePersonSchema,
} from "../../types/person.types.ts";
import { err, ok } from "../utils.ts";

export function registerPeopleTools(server: McpServer): void {
  const service = getPeopleService();

  // ── list_people ──────────────────────────────────────────────────────
  server.registerTool(
    "list_people",
    {
      description: "List all people in the project's people registry.",
      inputSchema: ListPeopleOptionsSchema.shape,
    },
    async ({ department }) => {
      const people = await service.list(department);
      return ok(people);
    },
  );

  // ── get_person ───────────────────────────────────────────────────────
  server.registerTool(
    "get_person",
    {
      description: "Get a single person by their ID.",
      inputSchema: {
        id: PersonSchema.shape.id.describe("Person ID"),
      },
    },
    async ({ id }) => {
      const person = await service.getById(id);
      if (!person) return err(`Person '${id}' not found`);
      return ok(person);
    },
  );

  // ── get_people_tree ──────────────────────────────────────────────────
  server.registerTool(
    "get_people_tree",
    {
      description:
        "Get the org chart as a hierarchical tree. Each node has a person " +
        "record with a 'children' array of their direct reports.",
      inputSchema: {},
    },
    async () => ok(await service.getTree()),
  );

  // ── get_people_summary ───────────────────────────────────────────────
  server.registerTool(
    "get_people_summary",
    {
      description:
        "Get people registry summary statistics: total headcount, " +
        "breakdown by department.",
      inputSchema: {},
    },
    async () => ok(await service.getSummary()),
  );

  // ── get_people_departments ───────────────────────────────────────────
  server.registerTool(
    "get_people_departments",
    {
      description: "List all department names used in the people registry.",
      inputSchema: {},
    },
    async () => ok(await service.getDepartments()),
  );

  // ── get_person_reports ───────────────────────────────────────────────
  server.registerTool(
    "get_person_reports",
    {
      description: "Get the direct reports for a given person.",
      inputSchema: {
        id: PersonSchema.shape.id.describe("Person ID"),
      },
    },
    async ({ id }) => ok(await service.getDirectReports(id)),
  );

  // ── create_person ────────────────────────────────────────────────────
  server.registerTool(
    "create_person",
    {
      description: "Add a new person to the people registry.",
      inputSchema: CreatePersonSchema.shape,
    },
    async (input) => {
      const person = await service.create(input);
      return ok({ id: person.id });
    },
  );

  // ── update_person ────────────────────────────────────────────────────
  server.registerTool(
    "update_person",
    {
      description: "Update an existing person's fields.",
      inputSchema: {
        id: PersonSchema.shape.id.describe("Person ID"),
        ...UpdatePersonSchema.shape,
      },
    },
    async ({ id, ...updates }) => {
      const person = await service.update(id, updates);
      if (!person) return err(`Person '${id}' not found`);
      return ok({ success: true });
    },
  );

  // ── delete_person ────────────────────────────────────────────────────
  server.registerTool(
    "delete_person",
    {
      description: "Delete a person from the registry by their ID.",
      inputSchema: {
        id: PersonSchema.shape.id.describe("Person ID"),
      },
    },
    async ({ id }) => {
      const success = await service.delete(id);
      if (!success) return err(`Person '${id}' not found`);
      return ok({ success: true });
    },
  );

  // ── agent_heartbeat ──────────────────────────────────────────────────
  server.registerTool(
    "agent_heartbeat",
    {
      description:
        "Update an agent's lastSeen timestamp and optionally set status " +
        "and currentTaskId. Call periodically to signal the agent is alive.",
      inputSchema: HeartbeatInputSchema.shape,
    },
    async ({ id, status, currentTaskId }) => {
      const success = await service.heartbeat(id, status, currentTaskId);
      if (!success) return err(`Person '${id}' not found`);
      return ok({ success: true });
    },
  );

  // ── get_person_by_name ─────────────────────────────────────────────
  server.registerTool(
    "get_person_by_name",
    {
      description:
        "Get a person by their name (case-insensitive). " +
        "Prefer this over list_people when the name is known.",
      inputSchema: {
        name: PersonSchema.shape.name.describe("Person name"),
      },
    },
    async ({ name }) => {
      const person = await service.getByName(name);
      if (!person) return err(`Person '${name}' not found`);
      return ok(person);
    },
  );

  // ── list_people_by_skill ───────────────────────────────────────────
  server.registerTool(
    "list_people_by_skill",
    {
      description:
        "List people who have a specific skill. " +
        "Use this to find candidates for task assignment.",
      inputSchema: ListPeopleBySkillSchema.shape,
    },
    async ({ skill }) => {
      const people = await service.listBySkill(skill);
      return ok(people);
    },
  );

  // ── get_people_availability ────────────────────────────────────────
  server.registerTool(
    "get_people_availability",
    {
      description:
        "Get available people. Excludes offline agents by default. " +
        "Use this before assigning tasks to check who is reachable.",
      inputSchema: GetPeopleAvailabilitySchema.shape,
    },
    async ({ excludeOffline }) => {
      const people = await service.getAvailable(excludeOffline ?? true);
      return ok(people);
    },
  );

  // ── find_person_for_task ───────────────────────────────────────────
  server.registerTool(
    "find_person_for_task",
    {
      description:
        "Find the best-fit people for a task based on required skills. " +
        "Returns a ranked list sorted by match score (highest first). " +
        "Excludes offline agents.",
      inputSchema: FindPersonForSkillsSchema.shape,
    },
    async ({ skills }) => {
      const matches = await service.findForSkills(skills);
      return ok(matches);
    },
  );

  // ── get_person_workload ────────────────────────────────────────────
  server.registerTool(
    "get_person_workload",
    {
      description:
        "Get a person's current workload info: status, current task, " +
        "capacity (hours/day, working days), and agent type. " +
        "Use this to check if someone has bandwidth before assigning work.",
      inputSchema: {
        id: PersonWorkloadSchema.shape.id.describe("Person ID"),
      },
    },
    async ({ id }) => {
      const workload = await service.getWorkload(id);
      if (!workload) return err(`Person '${id}' not found`);
      return ok(workload);
    },
  );
}
