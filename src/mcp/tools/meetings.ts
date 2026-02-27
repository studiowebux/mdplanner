/**
 * MCP tools for meeting operations.
 * Tools: list_meetings, get_meeting, create_meeting, update_meeting, delete_meeting
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ProjectManager } from "../../lib/project-manager.ts";
import { err, ok } from "./utils.ts";

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

  server.registerTool(
    "create_meeting",
    {
      description: "Create a new meeting record.",
      inputSchema: {
        title: z.string().describe("Meeting title"),
        date: z.string().describe("Meeting date (YYYY-MM-DD or ISO datetime)"),
        attendees: z.array(z.string()).optional().describe(
          "List of attendee names or person IDs",
        ),
        agenda: z.string().optional().describe("Meeting agenda (markdown)"),
        notes: z.string().optional().describe("Meeting notes (markdown body)"),
      },
    },
    async ({ title, date, attendees, agenda, notes }) => {
      const id = await parser.addMeeting({
        title,
        date,
        attendees: attendees ?? [],
        agenda: agenda ?? "",
        notes: notes ?? "",
        actions: [],
      });
      return ok({ id });
    },
  );

  server.registerTool(
    "update_meeting",
    {
      description: "Update an existing meeting's fields.",
      inputSchema: {
        id: z.string().describe("Meeting ID"),
        title: z.string().optional(),
        date: z.string().optional(),
        attendees: z.array(z.string()).optional(),
        agenda: z.string().optional(),
        notes: z.string().optional(),
      },
    },
    async ({ id, title, date, attendees, agenda, notes }) => {
      const success = await parser.updateMeeting(id, {
        ...(title !== undefined && { title }),
        ...(date !== undefined && { date }),
        ...(attendees !== undefined && { attendees }),
        ...(agenda !== undefined && { agenda }),
        ...(notes !== undefined && { notes }),
      });
      if (!success) return err(`Meeting '${id}' not found`);
      return ok({ success: true });
    },
  );

  server.registerTool(
    "delete_meeting",
    {
      description: "Delete a meeting by its ID.",
      inputSchema: { id: z.string().describe("Meeting ID") },
    },
    async ({ id }) => {
      const success = await parser.deleteMeeting(id);
      if (!success) return err(`Meeting '${id}' not found`);
      return ok({ success: true });
    },
  );
}
