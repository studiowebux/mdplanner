/**
 * MCP tools for brainstorm operations.
 * Tools: list_brainstorms, get_brainstorm, get_brainstorm_by_name,
 *        create_brainstorm, update_brainstorm, delete_brainstorm
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ProjectManager } from "../../lib/project-manager.ts";
import { err, ok } from "./utils.ts";

export function registerBrainstormTools(
  server: McpServer,
  pm: ProjectManager,
): void {
  const parser = pm.getActiveParser();

  server.registerTool(
    "list_brainstorms",
    {
      description: "List all brainstorms in the project.",
      inputSchema: {
        tag: z.string().optional().describe("Filter by tag"),
      },
    },
    async ({ tag }) => {
      const brainstorms = await parser.readBrainstorms();
      return ok(
        tag ? brainstorms.filter((b) => b.tags?.includes(tag)) : brainstorms,
      );
    },
  );

  server.registerTool(
    "get_brainstorm",
    {
      description: "Get a single brainstorm by its ID.",
      inputSchema: { id: z.string().describe("Brainstorm ID") },
    },
    async ({ id }) => {
      const brainstorm = await parser.readBrainstorm(id);
      if (!brainstorm) return err(`Brainstorm '${id}' not found`);
      return ok(brainstorm);
    },
  );

  server.registerTool(
    "get_brainstorm_by_name",
    {
      description:
        "Get a brainstorm by its title (case-insensitive). Prefer this over list_brainstorms when the title is known.",
      inputSchema: { name: z.string().describe("Brainstorm title") },
    },
    async ({ name }) => {
      const brainstorm = await parser.readBrainstormByName(name);
      if (!brainstorm) return err(`Brainstorm '${name}' not found`);
      return ok(brainstorm);
    },
  );

  server.registerTool(
    "create_brainstorm",
    {
      description:
        "Create a new brainstorm session. Questions are H2-level prompts with optional answers.",
      inputSchema: {
        title: z.string().describe("Brainstorm title"),
        tags: z.array(z.string()).optional(),
        linked_projects: z.array(z.string()).optional().describe(
          "Project IDs to link",
        ),
        linked_tasks: z.array(z.string()).optional().describe(
          "Task IDs to link",
        ),
        linked_goals: z.array(z.string()).optional().describe(
          "Goal IDs to link",
        ),
        questions: z
          .array(
            z.object({
              question: z.string(),
              answer: z.string().optional(),
            }),
          )
          .optional()
          .describe("Questions with optional answers"),
      },
    },
    async (
      { title, tags, linked_projects, linked_tasks, linked_goals, questions },
    ) => {
      const brainstorm = await parser.addBrainstorm({
        title,
        ...(tags && { tags }),
        ...(linked_projects && { linkedProjects: linked_projects }),
        ...(linked_tasks && { linkedTasks: linked_tasks }),
        ...(linked_goals && { linkedGoals: linked_goals }),
        questions: questions || [],
      });
      return ok({ id: brainstorm.id });
    },
  );

  server.registerTool(
    "update_brainstorm",
    {
      description: "Update an existing brainstorm's fields or questions.",
      inputSchema: {
        id: z.string().describe("Brainstorm ID"),
        title: z.string().optional(),
        tags: z.array(z.string()).optional(),
        linked_projects: z.array(z.string()).optional(),
        linked_tasks: z.array(z.string()).optional(),
        linked_goals: z.array(z.string()).optional(),
        questions: z
          .array(
            z.object({
              question: z.string(),
              answer: z.string().optional(),
            }),
          )
          .optional(),
      },
    },
    async ({
      id,
      title,
      tags,
      linked_projects,
      linked_tasks,
      linked_goals,
      questions,
    }) => {
      const updates: Record<string, unknown> = {};
      if (title !== undefined) updates.title = title;
      if (tags !== undefined) updates.tags = tags;
      if (linked_projects !== undefined) {
        updates.linkedProjects = linked_projects;
      }
      if (linked_tasks !== undefined) updates.linkedTasks = linked_tasks;
      if (linked_goals !== undefined) updates.linkedGoals = linked_goals;
      if (questions !== undefined) updates.questions = questions;
      const result = await parser.updateBrainstorm(id, updates);
      if (!result) return err(`Brainstorm '${id}' not found`);
      return ok({ success: true });
    },
  );

  server.registerTool(
    "delete_brainstorm",
    {
      description: "Delete a brainstorm by its ID.",
      inputSchema: { id: z.string().describe("Brainstorm ID") },
    },
    async ({ id }) => {
      const success = await parser.deleteBrainstorm(id);
      if (!success) return err(`Brainstorm '${id}' not found`);
      return ok({ success: true });
    },
  );
}
