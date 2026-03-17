// MCP tools for milestone operations — thin wrappers over MilestoneService.
// All Zod schemas derived from types/milestone.types.ts — single source of truth.

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getMilestoneService } from "../../singletons/services.ts";
import {
  CreateMilestoneSchema,
  ListMilestoneOptionsSchema,
  MilestoneBaseSchema,
  MilestoneSummaryQuerySchema,
  UpdateMilestoneSchema,
} from "../../types/milestone.types.ts";
import { DuplicateMilestoneError } from "../../services/milestone.service.ts";
import { ok, err } from "../utils.ts";

export function registerMilestoneTools(server: McpServer): void {
  const service = getMilestoneService();

  server.registerTool(
    "list_milestones",
    {
      description: "List all milestones in the project.",
      inputSchema: ListMilestoneOptionsSchema.shape,
    },
    async ({ status, project }) => {
      const milestones = await service.list({ status, project });
      return ok(milestones);
    },
  );

  server.registerTool(
    "get_milestone",
    {
      description: "Get a single milestone by its ID.",
      inputSchema: { id: MilestoneBaseSchema.shape.id.describe("Milestone ID") },
    },
    async ({ id }) => {
      const m = await service.getById(id);
      if (!m) return err(`Milestone '${id}' not found`);
      return ok(m);
    },
  );

  server.registerTool(
    "get_milestone_by_name",
    {
      description:
        "Get a milestone by its name (case-insensitive). Prefer this over list_milestones when the name is known.",
      inputSchema: { name: MilestoneBaseSchema.shape.name.describe("Milestone name") },
    },
    async ({ name }) => {
      const m = await service.getByName(name);
      if (!m) return err(`Milestone '${name}' not found`);
      return ok(m);
    },
  );

  server.registerTool(
    "get_milestone_summary",
    {
      description:
        "Get a milestone's tasks pre-grouped by section with slim fields. " +
        "Returns milestone metadata plus tasks grouped into In Progress, " +
        "Pending Review, Todo, Done (and any other sections). " +
        "Each task stub has only id, title, and tags. " +
        "Replaces list_tasks { milestone } + manual grouping — one call, ~3 KB instead of ~60 KB.",
      inputSchema: MilestoneSummaryQuerySchema.shape,
    },
    async ({ milestone, project }) => {
      const summary = await service.getSummary(milestone, project);
      if (!summary) return err(`Milestone '${milestone}' not found`);
      return ok(summary);
    },
  );

  server.registerTool(
    "create_milestone",
    {
      description:
        "Create a new milestone. project and name together must be unique — creating a duplicate returns an error.",
      inputSchema: {
        ...CreateMilestoneSchema.shape,
        // MCP requires project for uniqueness; REST leaves it optional
        project: CreateMilestoneSchema.shape.project.unwrap().describe(
          "Project this milestone belongs to (required to keep milestones unique per project)",
        ),
      },
    },
    async ({ name, project, description, target, status }) => {
      try {
        const m = await service.create({
          name,
          project,
          ...(description && { description }),
          ...(target && { target }),
          status: status ?? "open",
        });
        return ok({ id: m.id });
      } catch (e) {
        if (e instanceof DuplicateMilestoneError) return err(e.message);
        throw e;
      }
    },
  );

  server.registerTool(
    "update_milestone",
    {
      description: "Update an existing milestone's fields.",
      inputSchema: {
        id: MilestoneBaseSchema.shape.id.describe("Milestone ID"),
        ...UpdateMilestoneSchema.shape,
      },
    },
    async ({ id, ...fields }) => {
      const m = await service.update(id, fields);
      if (!m) return err(`Milestone '${id}' not found`);
      return ok({ success: true });
    },
  );

  server.registerTool(
    "delete_milestone",
    {
      description: "Delete a milestone by its ID.",
      inputSchema: { id: MilestoneBaseSchema.shape.id.describe("Milestone ID") },
    },
    async ({ id }) => {
      const success = await service.delete(id);
      if (!success) return err(`Milestone '${id}' not found`);
      return ok({ success: true });
    },
  );
}
