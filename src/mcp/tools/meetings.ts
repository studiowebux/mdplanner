/**
 * MCP tools for meeting operations.
 * Tools: list_meetings, get_meeting
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ProjectManager } from "../../lib/project-manager.ts";

function ok(data: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
  };
}

function err(message: string) {
  return {
    content: [{ type: "text" as const, text: `Error: ${message}` }],
    isError: true as const,
  };
}

export function registerMeetingTools(
  server: McpServer,
  pm: ProjectManager,
): void {
  const parser = pm.getActiveParser();

  server.registerTool(
    "list_meetings",
    {
      description: "List all meetings sorted by date descending.",
      inputSchema: {},
    },
    async () => {
      const meetings = await parser.readMeetings();
      return ok(meetings.map((m) => ({
        id: m.id,
        title: m.title,
        date: m.date,
        attendees: m.attendees,
        actionCount: m.actions.length,
        openActions: m.actions.filter((a) => a.status === "open").length,
      })));
    },
  );

  server.registerTool(
    "get_meeting",
    {
      description:
        "Get a single meeting by its ID, including agenda, notes, and action items.",
      inputSchema: { id: z.string().describe("Meeting ID") },
    },
    async ({ id }) => {
      const meetings = await parser.readMeetings();
      const meeting = meetings.find((m) => m.id === id);
      if (!meeting) return err(`Meeting '${id}' not found`);
      return ok(meeting);
    },
  );
}
