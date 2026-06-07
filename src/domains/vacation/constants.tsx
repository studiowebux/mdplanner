import type { ColumnDef } from "../../components/ui/data-table.tsx";
import type { FieldDef } from "../../components/ui/form-builder.tsx";
import type {
  VacationRequest,
  VacationRequestView,
} from "../../types/vacation.types.ts";
import {
  VACATION_STATUSES,
  VACATION_TYPES,
} from "../../types/vacation.types.ts";
import {
  type BadgeVariant,
  statusBadgeRenderer,
} from "../../components/ui/status-badge.tsx";

export const VACATION_STATUS_VARIANTS: Record<string, BadgeVariant> = {
  pending: "warning",
  approved: "success",
  rejected: "error",
};

function computeDays(startDate: string, endDate: string): number {
  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();
  if (isNaN(start) || isNaN(end) || end < start) return 0;
  return Math.round((end - start) / 86400000) + 1;
}

function vacationActionBtns(
  _value: unknown,
  row: Record<string, unknown>,
): unknown {
  return (
    <div class="card__actions">
      <button
        class="btn btn--secondary btn--sm"
        type="button"
        hx-get={`/vacation/${row.id}/edit`}
        hx-target="#vacation-form-container"
        hx-swap="innerHTML"
      >
        Edit
      </button>
      {row.status === "pending" && (
        <>
          <button
            class="btn btn--success btn--sm"
            type="button"
            hx-post={`/vacation/${row.id}/approve`}
            hx-swap="none"
            hx-confirm="Approve this request?"
          >
            Approve
          </button>
          <button
            class="btn btn--warning btn--sm"
            type="button"
            hx-post={`/vacation/${row.id}/reject`}
            hx-swap="none"
            hx-confirm="Reject this request?"
          >
            Reject
          </button>
        </>
      )}
      <button
        class="btn btn--danger btn--sm"
        type="button"
        hx-delete={`/vacation/${row.id}`}
        hx-confirm={`Delete request for "${row.personId}"? This cannot be undone.`}
        hx-swap="none"
      >
        Delete
      </button>
    </div>
  );
}

export const VACATION_TABLE_COLUMNS: ColumnDef[] = [
  {
    key: "personId",
    label: "Person",
    sortable: true,
    render: (_v, row) => (
      <a href={`/people/${row.personId}`}>
        {String(row.personName ?? row.personId)}
      </a>
    ),
  },
  { key: "startDate", label: "Start", sortable: true },
  { key: "endDate", label: "End", sortable: true },
  {
    key: "_days",
    label: "Days",
    render: (_v, row) =>
      String(computeDays(String(row.startDate), String(row.endDate))),
  },
  { key: "type", label: "Type", sortable: true },
  {
    key: "status",
    label: "Status",
    sortable: true,
    render: statusBadgeRenderer(VACATION_STATUS_VARIANTS),
  },
  { key: "_actions", label: "", render: vacationActionBtns },
];

export const VACATION_FORM_FIELDS: FieldDef[] = [
  {
    type: "autocomplete",
    name: "personId",
    label: "Person",
    source: "people",
    placeholder: "Search people...",
    required: true,
  },
  {
    type: "date",
    name: "startDate",
    label: "Start Date",
    required: true,
  },
  {
    type: "date",
    name: "endDate",
    label: "End Date",
    required: true,
  },
  {
    type: "select",
    name: "type",
    label: "Type",
    required: true,
    options: VACATION_TYPES.map((t) => ({ value: t, label: t })),
  },
  {
    type: "select",
    name: "status",
    label: "Status",
    required: true,
    options: VACATION_STATUSES.map((s) => ({ value: s, label: s })),
  },
  {
    type: "textarea",
    name: "notes",
    label: "Notes",
    rows: 3,
  },
];

export const VACATION_BODY_KEYS = ["notes"] as const;

export function vacationToRow(r: VacationRequestView): Record<string, unknown> {
  return {
    id: r.id,
    personId: r.personId,
    personName: r.personName,
    startDate: r.startDate,
    endDate: r.endDate,
    type: r.type,
    status: r.status,
    _days: computeDays(r.startDate, r.endDate),
  };
}
