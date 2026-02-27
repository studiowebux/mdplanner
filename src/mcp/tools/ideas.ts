/**
 * MCP tools for idea operations.
 * Tools: list_ideas, get_idea, create_idea, update_idea, delete_idea
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ProjectManager } from "../../lib/project-manager.ts";
import { err, ok } from "./utils.ts";

export function registerIdeaTools(server: McpServer, pm: ProjectManager): void {
  const parser = pm.getActiveParser();

  server.registerTool(
    "list_ideas",
    {
      description: "List all ideas in the project.",
      inputSchema: {
        category: z.string().optional().describe("Filter by category"),
      },
    },
    async ({ category }) => {
      const ideas = await parser.readIdeas();
      return ok(
        category ? ideas.filter((i) => i.category === category) : ideas,
      );
    },
  );

  server.registerTool(
    "get_idea",
    {
      description: "Get a single idea by its ID.",
      inputSchema: { id: z.string().describe("Idea ID") },
    },
    async ({ id }) => {
      const ideas = await parser.readIdeas();
      const idea = ideas.find((i) => i.id === id);
      if (!idea) return err(`Idea '${id}' not found`);
      return ok(idea);
    },
  );

  server.registerTool(
    "create_idea",
    {
      description: "Create a new idea.",
      inputSchema: {
        title: z.string().describe("Idea title"),
        category: z.string().optional(),
        priority: z.enum(["low", "medium", "high"]).optional(),
        description: z.string().optional().describe(
          "Idea description (markdown)",
        ),
        start_date: z.string().optional().describe("YYYY-MM-DD"),
        end_date: z.string().optional().describe("YYYY-MM-DD"),
        resources: z.string().optional(),
      },
    },
    async (
      {
        title,
        category,
        priority,
        description,
        start_date,
        end_date,
        resources,
      },
    ) => {
      const idea = await parser.addIdea({
        title,
        status: "new",
        ...(category && { category }),
        ...(priority && { priority }),
        ...(description && { description }),
        ...(start_date && { startDate: start_date }),
        ...(end_date && { endDate: end_date }),
        ...(resources && { resources }),
      });
      return ok({ id: idea.id });
    },
  );

  server.registerTool(
    "update_idea",
    {
      description: "Update an existing idea's fields.",
      inputSchema: {
        id: z.string().describe("Idea ID"),
        title: z.string().optional(),
        category: z.string().optional(),
        priority: z.enum(["low", "medium", "high"]).optional(),
        description: z.string().optional(),
        start_date: z.string().optional(),
        end_date: z.string().optional(),
        resources: z.string().optional(),
      },
    },
    async ({ id, ...updates }) => {
      const result = await parser.updateIdea(id, updates);
      if (!result) return err(`Idea '${id}' not found`);
      return ok({ success: true });
    },
  );

  server.registerTool(
    "delete_idea",
    {
      description: "Delete an idea by its ID.",
      inputSchema: { id: z.string().describe("Idea ID") },
    },
    async ({ id }) => {
      const success = await parser.deleteIdea(id);
      if (!success) return err(`Idea '${id}' not found`);
      return ok({ success: true });
    },
  );
}
