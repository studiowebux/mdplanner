// Meeting domain config — drives the factory for routes, views, and forms.

import type { DomainConfig } from "../../factories/domain.types.ts";
import type {
  CreateMeeting,
  Meeting,
  UpdateMeeting,
} from "../../types/meeting.types.ts";
import { getMeetingService } from "../../singletons/services.ts";
import { createSearchPredicate } from "../../utils/string.ts";
import { extractProjectNames } from "../../utils/filter-helpers.ts";
import {
  MEETING_FORM_FIELDS,
  MEETING_TABLE_COLUMNS,
  meetingToRow,
} from "./constants.tsx";
import { MeetingCard } from "../../views/components/meeting-card.tsx";
import { parseFormBody } from "../../utils/form-parser.ts";
import { buildActionPersonById } from "./owners.ts";

export const meetingConfig: DomainConfig<
  Meeting,
  CreateMeeting,
  UpdateMeeting
> = {
  name: "meetings",
  singular: "Meeting",
  path: "/meetings",
  ssePrefix: "meeting",
  styles: ["/css/views/meetings.css"],
  emptyMessage: "No meetings yet. Create one to get started.",
  defaultView: "table",

  // `agenda` and `notes` edit in-place on the detail page via "Edit Mode".
  inlineEditFields: ["agenda", "notes"],

  stateKeys: [
    "view",
    "q",
    "sort",
    "order",
    "date_from",
    "date_to",
    "open_actions_only",
    "project",
  ],
  columns: MEETING_TABLE_COLUMNS,
  formFields: MEETING_FORM_FIELDS,

  filters: [
    {
      name: "project",
      label: "All projects",
      options: [],
    },
    {
      name: "open_actions_only",
      label: "Open actions only",
      options: [
        { value: "", label: "All" },
        { value: "true", label: "Yes" },
      ],
    },
  ],

  extractFilterOptions: async () => {
    const projectNames = await extractProjectNames();
    return { project: projectNames };
  },

  toRow: meetingToRow,

  Card: ({ item, q }) => <MeetingCard item={item} q={q} />,

  parseCreate: (body) => {
    const parsed = parseFormBody(MEETING_FORM_FIELDS, body);
    // hidden field submits as a single string — wrap as array for the service
    if (typeof parsed.relatedMeetings === "string") {
      parsed.relatedMeetings = parsed.relatedMeetings
        ? [parsed.relatedMeetings]
        : [];
    }
    return parsed as CreateMeeting;
  },

  parseUpdate: (body) =>
    parseFormBody(MEETING_FORM_FIELDS, body, {
      clearEmpty: true,
    }) as Partial<UpdateMeeting>,

  // Resolve person IDs to names for the action-items array-table autocomplete.
  // Returns `{ owner: <name> }` only for IDs that resolve — legacy free-text
  // owners and deleted-person IDs are omitted, so AutocompleteWidget's
  // `displayValue ?? value ?? ""` fallback shows the raw stored value.
  resolveArrayDisplayValues: async (item) => {
    const personById = await buildActionPersonById(item.actions);
    return {
      actions: item.actions.map((a) => {
        const row: Record<string, string> = {};
        const name = a.owner ? personById[a.owner] : undefined;
        if (name) row.owner = name;
        return row;
      }),
    };
  },

  dateRangeFilter: { field: "date" },

  getService: () => getMeetingService(),
  projectField: "project",

  searchPredicate: createSearchPredicate<Meeting>([
    { type: "string", get: (m) => m.title },
    { type: "string", get: (m) => m.agenda ?? "" },
    { type: "string", get: (m) => m.notes ?? "" },
    { type: "array", get: (m) => m.attendees ?? [] },
  ]),
};
