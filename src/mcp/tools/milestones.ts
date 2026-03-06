/**
 * MCP tools for milestone operations.
 * Tools: list_milestones, get_milestone, create_milestone, update_milestone, delete_milestone
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ProjectManager } from "../../lib/project-manager.ts";
import { err, ok } from "./utils.ts";

export function registerMilestoneTools(
  server: McpServer,
  pm: ProjectManager,
): void {
  const parser = pm.getActiveParser();

  server.registerTool(
    "list_milestones",
    {
      description: "List all milestones in the project.",
      inputSchema: {
        status: z.enum(["open", "completed"]).optional().describe(
          "Filter by milestone status",
        ),
        project: z.string().optional().describe(
          "Filter by project name (matches milestone.project)",
        ),
      },
    },
    async ({ status, project }) => {
      let milestones = await parser.readMilestones();
      if (status) milestones = milestones.filter((m) => m.status === status);
      if (project) {
        milestones = milestones.filter((m) =>
          (m.project ?? "").toLowerCase() === project.toLowerCase()
        );
      }
      return ok(milestones);
    },
  );

  server.registerTool(
    "get_milestone",
    {
      description: "Get a single milestone by its ID.",
      inputSchema: { id: z.string().describe("Milestone ID") },
    },
    async ({ id }) => {
      const milestones = await parser.readMilestones();
      const m = milestones.find((m) => m.id === id);
      if (!m) return err(`Milestone '${id}' not found`);
      return ok(m);
    },
  );

  server.registerTool(
    "create_milestone",
    {
      description:
        "Create a new milestone. project and name together must be unique — creating a duplicate returns an error.",
      inputSchema: {
        name: z.string().describe("Milestone name"),
        project: z.string().describe(
          "Project this milestone belongs to (required to keep milestones unique per project)",
        ),
        description: z.string().describe(
          "Short description of what this milestone delivers (strongly recommended)",
        ).optional(),
        target: z.string().optional().describe("Target date (YYYY-MM-DD)"),
        status: z.enum(["open", "completed"]).optional(),
      },
    },
    async ({ name, project, description, target, status }) => {
      const existing = await parser.readMilestones();
      const duplicate = existing.find(
        (m) => m.name === name && m.project === project,
      );
      if (duplicate) {
        return err(
          `Milestone '${name}' already exists for project '${project}' (id: ${duplicate.id})`,
        );
      }
      const m = await parser.addMilestone({
        name,
        project,
        ...(description && { description }),
        ...(target && { target }),
        status: status ?? "open",
      });
      return ok({ id: m.id });
    },
  );

  server.registerTool(
    "update_milestone",
    {
      description: "Update an existing milestone's fields.",
      inputSchema: {
        id: z.string().describe("Milestone ID"),
        name: z.string().optional(),
        project: z.string().optional(),
        description: z.string().optional(),
        target: z.string().optional().describe("Target date (YYYY-MM-DD)"),
        status: z.enum(["open", "completed"]).optional(),
      },
    },
    async ({ id, name, project, description, target, status }) => {
      const updates: Record<string, unknown> = {
        ...(name !== undefined && { name }),
        ...(project !== undefined && { project }),
        ...(description !== undefined && { description }),
        ...(target !== undefined && { target }),
        ...(status !== undefined && { status }),
      };

      // Auto-manage completedAt: set when transitioning to completed, clear otherwise
      if (status === "completed") {
        const milestones = await parser.readMilestones();
        const existing = milestones.find((m) => m.id === id);
        if (existing && !existing.completedAt) {
          updates.completedAt = new Date().toISOString().split("T")[0];
        }
      } else if (status && status !== "completed") {
        updates.completedAt = undefined;
      }

      const success = await parser.updateMilestone(id, updates);
      if (!success) return err(`Milestone '${id}' not found`);
      return ok({ success: true });
    },
  );

  server.registerTool(
    "delete_milestone",
    {
      description: "Delete a milestone by its ID.",
      inputSchema: { id: z.string().describe("Milestone ID") },
    },
    async ({ id }) => {
      const success = await parser.deleteMilestone(id);
      if (!success) return err(`Milestone '${id}' not found`);
      return ok({ success: true });
    },
  );
}
