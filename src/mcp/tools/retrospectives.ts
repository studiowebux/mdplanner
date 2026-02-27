/**
 * MCP tools for retrospective operations.
 * Tools: list_retrospectives, get_retrospective, create_retrospective, delete_retrospective
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ProjectManager } from "../../lib/project-manager.ts";
import { err, ok } from "./utils.ts";

export function registerRetrospectiveTools(
  server: McpServer,
  pm: ProjectManager,
): void {
  const parser = pm.getActiveParser();

  server.registerTool(
    "list_retrospectives",
    {
      description: "List all retrospectives in the project.",
      inputSchema: {},
    },
    async () => ok(await parser.readRetrospectives()),
  );

  server.registerTool(
    "get_retrospective",
    {
      description: "Get a single retrospective by its ID.",
      inputSchema: { id: z.string().describe("Retrospective ID") },
    },
    async ({ id }) => {
      const retros = await parser.readRetrospectives();
      const r = retros.find((r) => r.id === id);
      if (!r) return err(`Retrospective '${id}' not found`);
      return ok(r);
    },
  );

  server.registerTool(
    "create_retrospective",
    {
      description: "Create a new retrospective.",
      inputSchema: {
        title: z.string().describe("Retrospective title"),
        date: z.string().optional().describe("Date (YYYY-MM-DD)"),
        status: z.enum(["open", "closed"]).optional(),
      },
    },
    async ({ title, date, status }) => {
      const r = await parser.addRetrospective({
        title,
        date: date ?? new Date().toISOString().slice(0, 10),
        status: status ?? "open",
        continue: [],
        stop: [],
        start: [],
      });
      return ok({ id: r.id });
    },
  );

  server.registerTool(
    "update_retrospective",
    {
      description: "Update a retrospective's fields.",
      inputSchema: {
        id: z.string().describe("Retrospective ID"),
        title: z.string().optional(),
        date: z.string().optional(),
        status: z.enum(["open", "closed"]).optional(),
        continue: z.array(z.string()).optional().describe(
          "Things to continue doing",
        ),
        stop: z.array(z.string()).optional().describe("Things to stop doing"),
        start: z.array(z.string()).optional().describe("Things to start doing"),
      },
    },
    async ({ id, title, date, status, ...rest }) => {
      const success = await parser.updateRetrospective(id, {
        ...(title !== undefined && { title }),
        ...(date !== undefined && { date }),
        ...(status !== undefined && { status }),
        ...(rest.continue !== undefined && { continue: rest.continue }),
        ...(rest.stop !== undefined && { stop: rest.stop }),
        ...(rest.start !== undefined && { start: rest.start }),
      });
      if (!success) return err(`Retrospective '${id}' not found`);
      return ok({ success: true });
    },
  );

  server.registerTool(
    "delete_retrospective",
    {
      description: "Delete a retrospective by its ID.",
      inputSchema: { id: z.string().describe("Retrospective ID") },
    },
    async ({ id }) => {
      const success = await parser.deleteRetrospective(id);
      if (!success) return err(`Retrospective '${id}' not found`);
      return ok({ success: true });
    },
  );
}
