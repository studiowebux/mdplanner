import type { ColumnDef } from "../../components/ui/data-table.tsx";
import type { FieldDef } from "../../components/ui/form-builder.tsx";
import type { CapacityPlan } from "../../types/capacity-plan.types.ts";
import { createActionBtns } from "../../components/ui/action-btns.tsx";
import { Highlight } from "../../utils/highlight.tsx";
import { formatDate } from "../../utils/time.ts";

// Fields that live in the body — excluded from frontmatter block.
export const CAPACITY_PLAN_BODY_KEYS = [
  "title",
  "teamMembers",
  "allocations",
] as const;

const actionBtns = createActionBtns(
  "capacity-plans",
  "capacity-plans-form-container",
);

// ---------------------------------------------------------------------------
// Table columns
// ---------------------------------------------------------------------------

export const CAPACITY_PLAN_TABLE_COLUMNS: ColumnDef[] = [
  {
    key: "title",
    label: "Title",
    sortable: true,
    render: (v, row) => (
      <a href={`/capacity-plans/${row.id}`}>
        <Highlight text={String(v)} q={row._q as string} />
      </a>
    ),
  },
  { key: "startDate", label: "Start", sortable: true },
  { key: "endDate", label: "End", sortable: true },
  { key: "budgetHours", label: "Budget (h)", sortable: true },
  { key: "memberCount", label: "Members", sortable: true },
  { key: "allocationCount", label: "Allocations", sortable: true },
  { key: "createdAtDisplay", label: "Created", sortable: true },
  { key: "_actions", label: "", render: actionBtns },
];

// ---------------------------------------------------------------------------
// Form fields (top-level scalars only — members/allocations via detail page)
// ---------------------------------------------------------------------------

export const CAPACITY_PLAN_FORM_FIELDS: FieldDef[] = [
  {
    type: "text",
    name: "title",
    label: "Title",
    required: true,
    maxLength: 200,
  },
  {
    type: "date",
    name: "startDate",
    label: "Start Date",
  },
  {
    type: "date",
    name: "endDate",
    label: "End Date",
  },
  {
    type: "number",
    name: "budgetHours",
    label: "Budget Hours",
  },
];

// ---------------------------------------------------------------------------
// Row mapper
// ---------------------------------------------------------------------------

export function capacityPlanToRow(p: CapacityPlan): Record<string, unknown> {
  return {
    id: p.id,
    title: p.title,
    startDate: p.startDate ?? "",
    endDate: p.endDate ?? "",
    budgetHours: p.budgetHours ?? "",
    memberCount: (p.teamMembers ?? []).length,
    allocationCount: (p.allocations ?? []).length,
    createdAtDisplay: formatDate(p.createdAt),
  };
}
