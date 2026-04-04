import type { ColumnDef } from "../../components/ui/data-table.tsx";
import type { Person } from "../../types/person.types.ts";
import {
  type BadgeVariant,
  statusBadgeRenderer,
} from "../../components/ui/status-badge.tsx";
import { Highlight } from "../../utils/highlight.tsx";

export const PERSON_TYPE_VARIANTS: Record<string, BadgeVariant> = {
  human: "success",
  ai: "accent",
  hybrid: "warning",
};

export const PERSON_STATUS_VARIANTS: Record<string, BadgeVariant> = {
  idle: "neutral",
  working: "success",
  offline: "error-solid",
};

const actionBtns = (_value: unknown, row: Record<string, unknown>) => (
  <div class="person-card__actions">
    <a class="btn btn--secondary btn--sm" href={`/people/${row.id}`}>
      View
    </a>
    <button
      class="btn btn--secondary btn--sm"
      type="button"
      hx-get={`/people/${row.id}/edit`}
      hx-target="#people-form-container"
      hx-swap="innerHTML"
    >
      Edit
    </button>
    <button
      class="btn btn--danger btn--sm"
      type="button"
      hx-delete={`/people/${row.id}`}
      hx-confirm={`Delete "${row.name}"? This cannot be undone.`}
      hx-swap="none"
    >
      Delete
    </button>
  </div>
);

export const PEOPLE_TABLE_COLUMNS: ColumnDef[] = [
  {
    key: "name",
    label: "Name",
    sortable: true,
    render: (v, row) => (
      <a href={`/people/${row.id}`}>
        <Highlight text={String(v)} q={row._q as string} />
      </a>
    ),
  },
  { key: "title", label: "Title", sortable: true },
  { key: "role", label: "Role", sortable: true },
  {
    key: "departments",
    label: "Department",
    sortable: true,
    render: (v) => String(v),
  },
  {
    key: "email",
    label: "Email",
    render: (v) => v ? <a href={`mailto:${v}`}>{String(v)}</a> : "",
  },
  {
    key: "agentType",
    label: "Type",
    sortable: true,
    render: statusBadgeRenderer(PERSON_TYPE_VARIANTS),
  },
  {
    key: "skills",
    label: "Skills",
    render: (v) => String(v),
  },
  {
    key: "status",
    label: "Status",
    sortable: true,
    render: statusBadgeRenderer(PERSON_STATUS_VARIANTS),
  },
  { key: "_actions", label: "", render: actionBtns },
];

export const PEOPLE_DOMAIN = "people";

export const PEOPLE_STATE_KEYS = [
  "view",
  "department",
  "agentType",
  "q",
  "sort",
  "order",
] as const;

export function personToRow(p: Person): Record<string, unknown> {
  return {
    id: p.id,
    name: p.name,
    title: p.title ?? "",
    role: p.role ?? "",
    departments: p.departments?.join(", ") ?? "",
    email: p.email ?? "",
    agentType: p.agentType ?? "human",
    skills: p.skills?.join(", ") ?? "",
    status: p.status ?? "",
  };
}
