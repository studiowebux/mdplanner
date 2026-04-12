// MCP tools for meeting operations — thin wrappers over MeetingService.

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getMeetingService } from "../../singletons/services.ts";
import {
  CreateMeetingSchema,
  ListMeetingOptionsSchema,
  MeetingSchema,
  UpdateMeetingSchema,
} from "../../types/meeting.types.ts";
import { z } from "@hono/zod-openapi";
import { err, ok } from "../utils.ts";

export function registerMeetingTools(server: McpServer): void {
  const service = getMeetingService();

  server.registerTool(
    "list_meetings",
    {
      description:
        "List all meetings sorted by date descending. Optionally filter by date range, search query, or open actions.",
      inputSchema: ListMeetingOptionsSchema.extend({
        open_actions_only: z.boolean().optional().describe(
          "Only include meetings with at least one open action item",
        ),
      }).shape,
    },
    async ({ q, date_from, date_to, open_actions_only }) => {
      const items = await service.list({
        q,
        date_from,
        date_to,
        open_actions_only: open_actions_only ? "true" : undefined,
      });
      return ok(
        items.map((m) => ({
          id: m.id,
          title: m.title,
          date: m.date,
          attendees: m.attendees,
          actionCount: m.actions.length,
          openActions: m.actions.filter((a) => a.status === "open").length,
        })),
      );
    },
  );

  server.registerTool(
    "get_meeting",
    {
      description:
        "Get a single meeting by its ID, including agenda, notes, and action items.",
      inputSchema: {
        id: MeetingSchema.shape.id.describe("Meeting ID"),
      },
    },
    async ({ id }) => {
      const item = await service.getById(id);
      if (!item) return err(`Meeting '${id}' not found`);
      return ok(item);
    },
  );

  server.registerTool(
    "get_meeting_by_name",
    {
      description:
        "Get a meeting by its title (case-insensitive). Prefer this over list_meetings when the title is known.",
      inputSchema: {
        name: MeetingSchema.shape.title.describe("Meeting title"),
      },
    },
    async ({ name }) => {
      const item = await (service as ReturnType<typeof getMeetingService>)
        .findByName(name);
      if (!item) return err(`Meeting '${name}' not found`);
      return ok(item);
    },
  );

  server.registerTool(
    "create_meeting",
    {
      description: "Create a new meeting record.",
      inputSchema: CreateMeetingSchema.shape,
    },
    async (input) => {
      const item = await service.create(input);
      return ok(item);
    },
  );

  server.registerTool(
    "update_meeting",
    {
      description:
        "Update an existing meeting's fields. Actions array is a full replacement.",
      inputSchema: {
        id: MeetingSchema.shape.id.describe("Meeting ID"),
        ...UpdateMeetingSchema.shape,
      },
    },
    async ({ id, ...data }) => {
      const item = await service.update(id, data);
      if (!item) return err(`Meeting '${id}' not found`);
      return ok(item);
    },
  );

  server.registerTool(
    "get_open_meeting_actions",
    {
      description:
        "Return all open (incomplete) action items across all meetings, optionally filtered to only meetings before a given date. Useful for planning follow-ups and identifying unresolved items.",
      inputSchema: {
        before_date: z.string().optional().describe(
          "Only include meetings on or before this date (YYYY-MM-DD)",
        ),
      },
    },
    async ({ before_date }) => {
      const entries = await service.getOpenActions(before_date);
      return ok(
        entries.map((e) => ({
          meetingId: e.meetingId,
          meetingTitle: e.meetingTitle,
          meetingDate: e.meetingDate,
          actionId: e.action.id,
          description: e.action.description,
          owner: e.action.owner,
          due: e.action.due,
        })),
      );
    },
  );

  server.registerTool(
    "delete_meeting",
    {
      description: "Delete a meeting by its ID.",
      inputSchema: {
        id: MeetingSchema.shape.id.describe("Meeting ID"),
      },
    },
    async ({ id }) => {
      const deleted = await service.delete(id);
      if (!deleted) return err(`Meeting '${id}' not found`);
      return ok({ success: true });
    },
  );
}
