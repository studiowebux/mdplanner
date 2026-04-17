/**
 * Meeting types — Zod schemas (single source), inferred types.
 * Meetings with attendees, agenda, notes, and action items.
 */

import { z } from "@hono/zod-openapi";
import { AuditFieldsSchema, stringArray } from "./shared.types.ts";

// ---------------------------------------------------------------------------
// Action item schema
// ---------------------------------------------------------------------------

export const MeetingActionSchema = z.object({
  id: z.string().openapi({
    description: "Action item ID",
    example: "action_1771000000001_abc",
  }),
  description: z.string().openapi({
    description: "What needs to be done",
    example: "Set up project repository and CI pipeline",
  }),
  owner: z.string().optional().openapi({
    description: "Person responsible for this action",
    example: "bob",
  }),
  due: z.string().optional().openapi({
    description: "Due date (YYYY-MM-DD)",
    example: "2026-02-24",
  }),
  status: z.enum(["open", "done"]).openapi({
    description: "Action item status",
    example: "open",
  }),
}).openapi("MeetingAction");

export type MeetingAction = z.infer<typeof MeetingActionSchema>;

// ---------------------------------------------------------------------------
// Zod schemas — single source of truth
// ---------------------------------------------------------------------------

export const MeetingSchema = z.object({
  id: z.string().openapi({
    description: "Meeting ID",
    example: "meeting_1771000000001_abc",
  }),
  title: z.string().openapi({
    description: "Meeting title",
    example: "Project Kickoff",
  }),
  date: z.string().openapi({
    description: "Meeting date (YYYY-MM-DD)",
    example: "2026-02-20",
  }),
  attendees: stringArray.optional().openapi({
    description: "List of attendee names or person IDs",
  }),
  agenda: z.string().optional().openapi({
    description: "Meeting agenda (markdown)",
    example: "Project kickoff — scope, timeline, and team responsibilities",
  }),
  notes: z.string().optional().openapi({
    description: "Meeting notes (markdown body)",
  }),
  actions: z.array(MeetingActionSchema).openapi({
    description: "Action items from this meeting",
  }),
  project: z.string().nullable().optional().openapi({
    description: "Linked project name (portfolio item title)",
  }),
  relatedMeetings: z.array(z.string()).optional().openapi({
    description: "IDs of related meetings (undirected graph)",
  }),
}).merge(AuditFieldsSchema).openapi("Meeting");

export type Meeting = z.infer<typeof MeetingSchema>;

// ---------------------------------------------------------------------------
// Create / Update — derived from MeetingSchema
// ---------------------------------------------------------------------------

export const CreateMeetingSchema = MeetingSchema.pick({
  title: true,
  date: true,
  attendees: true,
  agenda: true,
  notes: true,
  actions: true,
  project: true,
  relatedMeetings: true,
}).partial({
  attendees: true,
  agenda: true,
  notes: true,
  actions: true,
  project: true,
  relatedMeetings: true,
}).merge(AuditFieldsSchema.partial()).openapi("CreateMeeting");

export type CreateMeeting = z.infer<typeof CreateMeetingSchema>;

export const UpdateMeetingSchema = CreateMeetingSchema.partial().openapi(
  "UpdateMeeting",
);

export type UpdateMeeting = z.infer<typeof UpdateMeetingSchema>;

// ---------------------------------------------------------------------------
// Query options
// ---------------------------------------------------------------------------

export type OpenActionEntry = {
  meetingId: string;
  meetingTitle: string;
  meetingDate: string;
  action: MeetingAction;
};

export const AddMeetingActionSchema = z.object({
  description: z.string().min(1).openapi({
    description: "Action item description",
    example: "Follow up with the team on deliverables",
  }),
  owner: z.string().optional().openapi({ description: "Person responsible" }),
  due: z.string().optional().openapi({ description: "Due date (YYYY-MM-DD)" }),
}).openapi("AddMeetingAction");

export type AddMeetingAction = z.infer<typeof AddMeetingActionSchema>;

export const ActionIdParam = z.object({
  id: z.string().openapi({ param: { name: "id", in: "path" } }),
  actionId: z.string().openapi({ param: { name: "actionId", in: "path" } }),
});

export const LinkMeetingSchema = z.object({
  linkedId: z.string().min(1).openapi({
    description: "ID of the meeting to link",
    example: "meeting_1771000000001_abc",
  }),
}).openapi("LinkMeeting");

export type LinkMeeting = z.infer<typeof LinkMeetingSchema>;

export const LinkedIdParam = z.object({
  id: z.string().openapi({ param: { name: "id", in: "path" } }),
  linkedId: z.string().openapi({ param: { name: "linkedId", in: "path" } }),
});

export const ListMeetingOptionsSchema = z.object({
  q: z.string().optional().openapi({
    param: { name: "q", in: "query" },
    description: "Search query (matches title, agenda, notes)",
  }),
  date_from: z.string().optional().openapi({
    param: { name: "date_from", in: "query" },
    description: "Only include meetings on or after this date (YYYY-MM-DD)",
  }),
  date_to: z.string().optional().openapi({
    param: { name: "date_to", in: "query" },
    description: "Only include meetings on or before this date (YYYY-MM-DD)",
  }),
  open_actions_only: z.string().optional().openapi({
    param: { name: "open_actions_only", in: "query" },
    description: "Only include meetings with at least one open action item",
  }),
  project: z.string().optional().openapi({
    param: { name: "project", in: "query" },
    description: "Filter by linked project name",
  }),
});

export type ListMeetingOptions = z.infer<typeof ListMeetingOptionsSchema>;
