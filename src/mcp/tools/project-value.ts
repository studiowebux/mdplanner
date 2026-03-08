/**
 * MCP tools for Project Value Board operations.
 * Tools: list_project_value_boards, get_project_value_board,
 *        create_project_value_board, update_project_value_board,
 *        delete_project_value_board
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ProjectManager } from "../../lib/project-manager.ts";
import { err, ok } from "./utils.ts";

const STRING_ARRAY = z.array(z.string()).optional();

export function registerProjectValueTools(
  server: McpServer,
  pm: ProjectManager,
): void {
  const parser = pm.getActiveParser();

  server.registerTool(
    "list_project_value_boards",
    {
      description: "List all Project Value Boards.",
      inputSchema: {},
    },
    async () => ok(await parser.readProjectValueBoards()),
  );

  server.registerTool(
    "get_project_value_board",
    {
      description: "Get a single Project Value Board by its ID.",
      inputSchema: { id: z.string().describe("Board ID") },
    },
    async ({ id }) => {
      const boards = await parser.readProjectValueBoards();
      const board = boards.find((b) => b.id === id);
      if (!board) return err(`Project Value Board '${id}' not found`);
      return ok(board);
    },
  );

  server.registerTool(
    "create_project_value_board",
    {
      description: "Create a new Project Value Board.",
      inputSchema: {
        title: z.string().describe("Board title"),
        date: z.string().optional().describe("Date (YYYY-MM-DD)"),
        customerSegments: STRING_ARRAY.describe("Target customer segments"),
        problem: STRING_ARRAY.describe("Problems to solve"),
        solution: STRING_ARRAY.describe("Proposed solutions"),
        benefit: STRING_ARRAY.describe("Expected benefits"),
      },
    },
    async ({ title, date, ...fields }) => {
      const board = await parser.addProjectValueBoard({
        title,
        date: date ?? new Date().toISOString().slice(0, 10),
        customerSegments: fields.customerSegments ?? [],
        problem: fields.problem ?? [],
        solution: fields.solution ?? [],
        benefit: fields.benefit ?? [],
      });
      return ok({ id: board.id });
    },
  );

  server.registerTool(
    "update_project_value_board",
    {
      description: "Update an existing Project Value Board.",
      inputSchema: {
        id: z.string().describe("Board ID"),
        title: z.string().optional(),
        date: z.string().optional(),
        customerSegments: STRING_ARRAY,
        problem: STRING_ARRAY,
        solution: STRING_ARRAY,
        benefit: STRING_ARRAY,
      },
    },
    async ({ id, ...updates }) => {
      const updated = await parser.updateProjectValueBoard(id, updates);
      if (!updated) return err(`Project Value Board '${id}' not found`);
      return ok({ success: true });
    },
  );

  server.registerTool(
    "delete_project_value_board",
    {
      description: "Delete a Project Value Board by its ID.",
      inputSchema: { id: z.string().describe("Board ID") },
    },
    async ({ id }) => {
      const success = await parser.deleteProjectValueBoard(id);
      if (!success) return err(`Project Value Board '${id}' not found`);
      return ok({ success: true });
    },
  );
}
