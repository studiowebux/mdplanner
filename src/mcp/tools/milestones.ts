/**
 * MCP tools for milestone operations.
 * Tools: list_milestones, get_milestone, get_milestone_summary, create_milestone, update_milestone, delete_milestone
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ProjectManager } from "../../lib/project-manager.ts";
import { Task } from "../../lib/types.ts";
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

      // Enrich with task counts and completion percentage
      const tasks = await parser.readTasks();
      const flat = flattenTasks(tasks);
      const enriched = milestones.map((m) => {
        const linked = flat.filter(
          (t) =>
            (t.config?.milestone ?? "").toLowerCase() ===
              m.name.toLowerCase(),
        );
        const taskCount = linked.length;
        const doneCount = linked.filter((t) => t.completed).length;
        return {
          ...m,
          taskCount,
          doneCount,
          completionPct: taskCount > 0
            ? Math.round((doneCount / taskCount) * 100)
            : 0,
        };
      });
      return ok(enriched);
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
    "get_milestone_by_name",
    {
      description:
        "Get a milestone by its name (case-insensitive). Prefer this over list_milestones when the name is known.",
      inputSchema: { name: z.string().describe("Milestone name") },
    },
    async ({ name }) => {
      const m = await parser.readMilestoneByName(name);
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
      inputSchema: {
        milestone: z.string().describe("Milestone name (e.g. 'v0.36.2')"),
        project: z.string().optional().describe(
          "Filter tasks by project name (case-insensitive)",
        ),
      },
    },
    async ({ milestone, project }) => {
      const m = await parser.readMilestoneByName(milestone);
      if (!m) return err(`Milestone '${milestone}' not found`);

      const tasks = await parser.readTasks();
      let flat = flattenTasks(tasks);

      // Filter to tasks in this milestone
      flat = flat.filter(
        (t) =>
          (t.config?.milestone ?? "").toLowerCase() ===
            milestone.toLowerCase(),
      );
      if (project) {
        flat = flat.filter(
          (t) =>
            (t.config?.project ?? "").toLowerCase() === project.toLowerCase(),
        );
      }

      // Group by section, ordered: In Progress, Pending Review, Todo, Done, then any others
      const sectionOrder = ["In Progress", "Pending Review", "Todo", "Done"];
      const sections: Record<
        string,
        { id: string; title: string; tags: string[] }[]
      > = {};
      for (const name of sectionOrder) {
        sections[name] = [];
      }
      for (const t of flat) {
        const sec = t.section;
        if (!sections[sec]) sections[sec] = [];
        sections[sec].push({
          id: t.id,
          title: t.title,
          tags: t.config?.tags ?? [],
        });
      }

      const totalDone = sections["Done"].length;
      const totalOpen = flat.length - totalDone;
      const completionPct = flat.length > 0
        ? Math.round((totalDone / flat.length) * 100)
        : 0;

      return ok({
        milestone: m.name,
        id: m.id,
        status: m.status,
        description: m.description,
        target: m.target,
        totalOpen,
        totalDone,
        completionPct,
        sections,
      });
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
      } else if (status) {
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

/** Flattens a task tree into a single-level array. */
function flattenTasks(tasks: Task[]): Task[] {
  const result: Task[] = [];
  for (const task of tasks) {
    result.push(task);
    if (task.children?.length) {
      result.push(...flattenTasks(task.children));
    }
  }
  return result;
}
