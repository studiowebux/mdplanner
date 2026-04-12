// Meeting domain config — drives the factory for routes, views, and forms.

import type { DomainConfig } from "../../factories/domain.types.ts";
import type {
  CreateMeeting,
  Meeting,
  UpdateMeeting,
} from "../../types/meeting.types.ts";
import { getMeetingService } from "../../singletons/services.ts";
import { createSearchPredicate } from "../../utils/string.ts";
import {
  MEETING_FORM_FIELDS,
  MEETING_TABLE_COLUMNS,
  meetingToRow,
} from "./constants.tsx";
import { MeetingCard } from "../../views/components/meeting-card.tsx";
import { parseFormBody } from "../../utils/form-parser.ts";

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

  stateKeys: [
    "view",
    "q",
    "sort",
    "order",
    "date_from",
    "date_to",
    "open_actions_only",
  ],
  columns: MEETING_TABLE_COLUMNS,
  formFields: MEETING_FORM_FIELDS,

  filters: [
    {
      name: "open_actions_only",
      label: "Open actions only",
      options: [
        { value: "true", label: "Yes" },
      ],
    },
  ],

  toRow: meetingToRow,

  Card: ({ item, q }) => <MeetingCard item={item} q={q} />,

  parseCreate: (body) =>
    parseFormBody(MEETING_FORM_FIELDS, body) as CreateMeeting,

  parseUpdate: (body) =>
    parseFormBody(MEETING_FORM_FIELDS, body, {
      clearEmpty: true,
    }) as Partial<UpdateMeeting>,

  getService: () => getMeetingService(),

  searchPredicate: createSearchPredicate<Meeting>([
    { type: "string", get: (m) => m.title },
    { type: "string", get: (m) => m.agenda ?? "" },
    { type: "string", get: (m) => m.notes ?? "" },
    { type: "array", get: (m) => m.attendees ?? [] },
  ]),
};
