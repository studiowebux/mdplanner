import type { ColumnDef } from "../../components/ui/data-table.tsx";
import type { FieldDef } from "../../components/ui/form-builder.tsx";
import type { VacationRequest } from "../../types/vacation.types.ts";
import {
  VACATION_STATUSES,
  VACATION_TYPES,
} from "../../types/vacation.types.ts";
import { createActionBtns } from "../../components/ui/action-btns.tsx";
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

const actionBtns = createActionBtns("vacation", "vacation-form-container");

export const VACATION_TABLE_COLUMNS: ColumnDef[] = [
  {
    key: "personId",
    label: "Person",
    sortable: true,
    render: (v) => <a href={`/people/${v}`}>{String(v)}</a>,
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
  { key: "_actions", label: "", render: actionBtns },
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

export function vacationToRow(r: VacationRequest): Record<string, unknown> {
  return {
    id: r.id,
    personId: r.personId,
    startDate: r.startDate,
    endDate: r.endDate,
    type: r.type,
    status: r.status,
    _days: computeDays(r.startDate, r.endDate),
  };
}
