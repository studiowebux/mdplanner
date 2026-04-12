import type { ColumnDef } from "../../components/ui/data-table.tsx";
import type { FieldDef } from "../../components/ui/form-builder.tsx";
import type { Meeting } from "../../types/meeting.types.ts";
import { createActionBtns } from "../../components/ui/action-btns.tsx";
import { Highlight } from "../../utils/highlight.tsx";
import { formatDate } from "../../utils/time.ts";
import { toKebab } from "../../utils/slug.ts";

// ---------------------------------------------------------------------------
// Action buttons
// ---------------------------------------------------------------------------

const actionBtns = createActionBtns("meetings", "meetings-form-container");

// ---------------------------------------------------------------------------
// Table columns
// ---------------------------------------------------------------------------

export const MEETING_TABLE_COLUMNS: ColumnDef[] = [
  {
    key: "title",
    label: "Title",
    sortable: true,
    render: (v, row) => (
      <a href={`/meetings/${row.id}`}>
        <Highlight text={String(v)} q={row._q as string} />
      </a>
    ),
  },
  {
    key: "date",
    label: "Date",
    sortable: true,
  },
  {
    key: "attendeesDisplay",
    label: "Attendees",
    sortable: false,
  },
  {
    key: "actionCount",
    label: "Actions",
    sortable: true,
  },
  {
    key: "openActions",
    label: "Open",
    sortable: true,
    render: (v) => {
      const count = Number(v);
      return count > 0
        ? <span class="badge badge--warning">{count}</span>
        : <span class="badge badge--success">0</span>;
    },
  },
  {
    key: "createdAtDisplay",
    label: "Created",
    sortable: true,
  },
  {
    key: "project",
    label: "Project",
    sortable: true,
    render: (v, row) =>
      v
        ? (
          <a href={`/portfolio/${toKebab(String(v))}`}>
            <Highlight text={String(v)} q={row._q as string} />
          </a>
        )
        : "",
  },
  { key: "_actions", label: "", render: actionBtns },
];

// ---------------------------------------------------------------------------
// Form fields
// ---------------------------------------------------------------------------

export const MEETING_FORM_FIELDS: FieldDef[] = [
  {
    type: "text",
    name: "title",
    label: "Title",
    required: true,
    maxLength: 200,
  },
  {
    type: "date",
    name: "date",
    label: "Date",
  },
  {
    type: "tags",
    name: "attendees",
    label: "Attendees",
    source: "people",
    placeholder: "Search people...",
  },
  {
    type: "textarea",
    name: "agenda",
    label: "Agenda",
    rows: 4,
  },
  {
    type: "textarea",
    name: "notes",
    label: "Notes",
    rows: 6,
  },
  {
    type: "autocomplete",
    name: "project",
    label: "Project",
    source: "portfolio",
    placeholder: "Search projects...",
  },
  { type: "hidden", name: "relatedMeetings" },
  {
    type: "array-table",
    name: "actions",
    label: "Action Item",
    section: "meeting_actions",
    addLabel: "Add action item",
    itemFields: [
      {
        type: "text",
        name: "description",
        label: "Description",
        placeholder: "What needs to be done?",
      },
      {
        type: "text",
        name: "owner",
        label: "Owner",
        placeholder: "Person responsible",
      },
      {
        type: "date",
        name: "due",
        label: "Due date",
      },
      {
        type: "select",
        name: "status",
        label: "Status",
        options: [
          { value: "open", label: "Open" },
          { value: "done", label: "Done" },
        ],
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Row mapper
// ---------------------------------------------------------------------------

export function meetingToRow(m: Meeting): Record<string, unknown> {
  const attendees = m.attendees ?? [];
  const attendeesDisplay = attendees.length > 3
    ? `${attendees.slice(0, 3).join(", ")} +${attendees.length - 3}`
    : attendees.join(", ");

  return {
    id: m.id,
    title: m.title,
    date: m.date,
    attendeesDisplay,
    actionCount: m.actions.length,
    openActions: m.actions.filter((a) => a.status === "open").length,
    createdAtDisplay: formatDate(m.createdAt),
    project: m.project ?? "",
  };
}
