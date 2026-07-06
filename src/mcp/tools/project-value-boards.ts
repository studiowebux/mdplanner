// MCP tools for Project Value Board operations — thin wrappers over ProjectValueBoardService.

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { defineMcpModule } from "../module.ts";
import { z } from "zod";
import { getProjectValueBoardService } from "../../singletons/services.ts";
import { type ProjectValueBoardSectionKey } from "../../types/project-value-board.types.ts";
import { err, ok, projectSlim, slimParam } from "../utils.ts";

const stringArray = z.array(z.string());

export function registerProjectValueBoardTools(server: McpServer): void {
  const service = getProjectValueBoardService();

  server.registerTool(
    "list_project_value_boards",
    {
      description: "List all project value boards.",
      inputSchema: {
        q: z.string().optional().describe(
          "Search query (matches title, notes, and section items)",
        ),
        project: z.string().optional().describe(
          "Filter by linked project name",
        ),
        slim: slimParam,
      },
    },
    async ({ q, project, slim }) => {
      const items = await service.list({ q, project });
      return slim
        ? ok(projectSlim(items, ["title", "project", "date"]))
        : ok(items);
    },
  );

  server.registerTool(
    "get_project_value_board",
    {
      description: "Get a single project value board by its ID.",
      inputSchema: {
        id: z.string().describe("Project value board ID"),
      },
    },
    async ({ id }) => {
      const item = await service.getById(id);
      if (!item) return err(`Project value board '${id}' not found`);
      return ok(item);
    },
  );

  server.registerTool(
    "create_project_value_board",
    {
      description:
        "Create a new project value board with customer segments, problems, solutions, and benefits.",
      inputSchema: {
        title: z.string().describe("Board title"),
        date: z.string().optional().describe("Board date (YYYY-MM-DD)"),
        customerSegments: stringArray.optional().describe(
          "Customer segments / target audiences",
        ),
        problem: stringArray.optional().describe(
          "Problems or pain points being solved",
        ),
        solution: stringArray.optional().describe(
          "Solutions or how the problem is solved",
        ),
        benefit: stringArray.optional().describe(
          "Benefits or value delivered",
        ),
        project: z.string().optional().describe("Linked project name"),
        notes: z.string().optional().describe(
          "Additional notes (markdown)",
        ),
      },
    },
    async (
      {
        title,
        date,
        customerSegments,
        problem,
        solution,
        benefit,
        project,
        notes,
      },
    ) => {
      const item = await service.create({
        title,
        date: date ?? new Date().toISOString().slice(0, 10),
        customerSegments: customerSegments ?? [],
        problem: problem ?? [],
        solution: solution ?? [],
        benefit: benefit ?? [],
        project,
        notes,
      });
      return ok({ id: item.id });
    },
  );

  server.registerTool(
    "update_project_value_board",
    {
      description:
        "Update a project value board. To add/remove individual items use add/remove tools.",
      inputSchema: {
        id: z.string().describe("Project value board ID"),
        title: z.string().optional(),
        date: z.string().optional().describe("Board date (YYYY-MM-DD)"),
        customerSegments: stringArray.optional().describe(
          "Replace entire customer segments list",
        ),
        problem: stringArray.optional().describe(
          "Replace entire problems list",
        ),
        solution: stringArray.optional().describe(
          "Replace entire solutions list",
        ),
        benefit: stringArray.optional().describe(
          "Replace entire benefits list",
        ),
        project: z.string().optional().describe("Linked project name"),
        notes: z.string().optional(),
      },
    },
    async (
      {
        id,
        title,
        date,
        customerSegments,
        problem,
        solution,
        benefit,
        project,
        notes,
      },
    ) => {
      const updated = await service.update(id, {
        ...(title !== undefined && { title }),
        ...(date !== undefined && { date }),
        ...(customerSegments !== undefined && { customerSegments }),
        ...(problem !== undefined && { problem }),
        ...(solution !== undefined && { solution }),
        ...(benefit !== undefined && { benefit }),
        ...(project !== undefined && { project }),
        ...(notes !== undefined && { notes }),
      });
      if (!updated) return err(`Project value board '${id}' not found`);
      return ok({ success: true });
    },
  );

  server.registerTool(
    "delete_project_value_board",
    {
      description: "Delete a project value board by its ID.",
      inputSchema: {
        id: z.string().describe("Project value board ID"),
      },
    },
    async ({ id }) => {
      const success = await service.delete(id);
      if (!success) return err(`Project value board '${id}' not found`);
      return ok({ success: true });
    },
  );

  server.registerTool(
    "add_project_value_board_item",
    {
      description:
        "Append a single item to a section of a project value board.",
      inputSchema: {
        id: z.string().describe("Project value board ID"),
        section: z.enum(["customerSegments", "problem", "solution", "benefit"])
          .describe("Section to add the item to"),
        text: z.string().describe("Item text"),
      },
    },
    async ({ id, section, text }) => {
      const board = await service.getById(id);
      if (!board) return err(`Project value board '${id}' not found`);
      const key = section as ProjectValueBoardSectionKey;
      const items = [...board[key], text.trim()];
      await service.update(id, { [key]: items });
      return ok({ success: true });
    },
  );

  server.registerTool(
    "remove_project_value_board_item",
    {
      description:
        "Remove an item by index from a section of a project value board.",
      inputSchema: {
        id: z.string().describe("Project value board ID"),
        section: z.enum(["customerSegments", "problem", "solution", "benefit"])
          .describe("Section to remove from"),
        index: z.number().int().describe(
          "Zero-based index of the item to remove",
        ),
      },
    },
    async ({ id, section, index }) => {
      const board = await service.getById(id);
      if (!board) return err(`Project value board '${id}' not found`);
      const key = section as ProjectValueBoardSectionKey;
      const items = [...board[key]];
      if (index < 0 || index >= items.length) {
        return err(`Index ${index} out of range for section '${section}'`);
      }
      items.splice(index, 1);
      await service.update(id, { [key]: items });
      return ok({ success: true });
    },
  );
}

export const projectValueBoardModule = defineMcpModule({
  feature: "project_value",
  register: registerProjectValueBoardTools,
});
