/**
 * MCP tools for brief operations.
 * Tools: list_briefs, get_brief, create_brief, update_brief, delete_brief
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ProjectManager } from "../../lib/project-manager.ts";
import { err, ok } from "./utils.ts";

export function registerBriefTools(
  server: McpServer,
  pm: ProjectManager,
): void {
  const parser = pm.getActiveParser();

  server.registerTool(
    "list_briefs",
    {
      description: "List all project briefs.",
      inputSchema: {},
    },
    async () => ok(await parser.readBriefs()),
  );

  server.registerTool(
    "get_brief",
    {
      description: "Get a single brief by its ID.",
      inputSchema: { id: z.string().describe("Brief ID") },
    },
    async ({ id }) => {
      const briefs = await parser.readBriefs();
      const b = briefs.find((b) => b.id === id);
      if (!b) return err(`Brief '${id}' not found`);
      return ok(b);
    },
  );

  server.registerTool(
    "create_brief",
    {
      description: "Create a new project brief (RACI + summary + principles).",
      inputSchema: {
        title: z.string().describe("Brief title"),
        date: z.string().optional().describe("Date (YYYY-MM-DD)"),
        summary: z.array(z.string()).optional().describe(
          "Executive summary bullet points",
        ),
        mission: z.array(z.string()).optional(),
        responsible: z.array(z.string()).optional(),
        accountable: z.array(z.string()).optional(),
        consulted: z.array(z.string()).optional(),
        informed: z.array(z.string()).optional(),
        highLevelBudget: z.array(z.string()).optional(),
        highLevelTimeline: z.array(z.string()).optional(),
        culture: z.array(z.string()).optional(),
        changeCapacity: z.array(z.string()).optional(),
        guidingPrinciples: z.array(z.string()).optional(),
      },
    },
    async ({ title, date, ...rest }) => {
      const b = await parser.addBrief({
        title,
        date: date ?? new Date().toISOString().slice(0, 10),
        summary: rest.summary ?? [],
        mission: rest.mission ?? [],
        responsible: rest.responsible ?? [],
        accountable: rest.accountable ?? [],
        consulted: rest.consulted ?? [],
        informed: rest.informed ?? [],
        highLevelBudget: rest.highLevelBudget ?? [],
        highLevelTimeline: rest.highLevelTimeline ?? [],
        culture: rest.culture ?? [],
        changeCapacity: rest.changeCapacity ?? [],
        guidingPrinciples: rest.guidingPrinciples ?? [],
      });
      return ok({ id: b.id });
    },
  );

  server.registerTool(
    "update_brief",
    {
      description: "Update an existing brief's fields.",
      inputSchema: {
        id: z.string().describe("Brief ID"),
        title: z.string().optional(),
        summary: z.array(z.string()).optional(),
        mission: z.array(z.string()).optional(),
        responsible: z.array(z.string()).optional(),
        accountable: z.array(z.string()).optional(),
        consulted: z.array(z.string()).optional(),
        informed: z.array(z.string()).optional(),
        highLevelBudget: z.array(z.string()).optional(),
        highLevelTimeline: z.array(z.string()).optional(),
        culture: z.array(z.string()).optional(),
        changeCapacity: z.array(z.string()).optional(),
        guidingPrinciples: z.array(z.string()).optional(),
      },
    },
    async ({ id, title, ...rest }) => {
      const success = await parser.updateBrief(id, {
        ...(title !== undefined && { title }),
        ...(rest.summary !== undefined && { summary: rest.summary }),
        ...(rest.mission !== undefined && { mission: rest.mission }),
        ...(rest.responsible !== undefined &&
          { responsible: rest.responsible }),
        ...(rest.accountable !== undefined &&
          { accountable: rest.accountable }),
        ...(rest.consulted !== undefined && { consulted: rest.consulted }),
        ...(rest.informed !== undefined && { informed: rest.informed }),
        ...(rest.highLevelBudget !== undefined &&
          { highLevelBudget: rest.highLevelBudget }),
        ...(rest.highLevelTimeline !== undefined &&
          { highLevelTimeline: rest.highLevelTimeline }),
        ...(rest.culture !== undefined && { culture: rest.culture }),
        ...(rest.changeCapacity !== undefined &&
          { changeCapacity: rest.changeCapacity }),
        ...(rest.guidingPrinciples !== undefined &&
          { guidingPrinciples: rest.guidingPrinciples }),
      });
      if (!success) return err(`Brief '${id}' not found`);
      return ok({ success: true });
    },
  );

  server.registerTool(
    "delete_brief",
    {
      description: "Delete a brief by its ID.",
      inputSchema: { id: z.string().describe("Brief ID") },
    },
    async ({ id }) => {
      const success = await parser.deleteBrief(id);
      if (!success) return err(`Brief '${id}' not found`);
      return ok({ success: true });
    },
  );
}
