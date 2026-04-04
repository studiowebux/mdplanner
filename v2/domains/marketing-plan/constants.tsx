import type { ColumnDef } from "../../components/ui/data-table.tsx";
import type { FieldDef } from "../../components/ui/form-builder.tsx";
import type { MarketingPlan } from "../../types/marketing-plan.types.ts";
import {
  MARKETING_ITEM_STATUSES,
  MARKETING_PLAN_STATUSES,
} from "../../types/marketing-plan.types.ts";
import {
  type BadgeVariant,
  statusBadgeRenderer,
} from "../../components/ui/status-badge.tsx";
import { Highlight } from "../../utils/highlight.tsx";
import { formatDate } from "../../utils/time.ts";

// ---------------------------------------------------------------------------
// Badge variant maps
// ---------------------------------------------------------------------------

export const MKTPLAN_STATUS_VARIANTS: Record<string, BadgeVariant> = {
  draft: "accent",
  active: "success",
  completed: "info",
  archived: "neutral",
};

export const MKTPLAN_ITEM_STATUS_VARIANTS: Record<string, BadgeVariant> = {
  planned: "accent",
  active: "success",
  paused: "warning",
  completed: "info",
};

export const MKTPLAN_VERDICT_VARIANTS: Record<string, BadgeVariant> = {
  pending: "accent",
  confirmed: "success",
  partial: "warning",
  rejected: "error",
};

// ---------------------------------------------------------------------------
// Option lists
// ---------------------------------------------------------------------------

export const MKTPLAN_STATUS_OPTIONS = MARKETING_PLAN_STATUSES.map((s) => ({
  value: s,
  label: s.charAt(0).toUpperCase() + s.slice(1),
}));

export const MKTPLAN_ITEM_STATUS_OPTIONS = MARKETING_ITEM_STATUSES.map((
  s,
) => ({
  value: s,
  label: s.charAt(0).toUpperCase() + s.slice(1),
}));

// ---------------------------------------------------------------------------
// Table columns
// ---------------------------------------------------------------------------

const actionBtns = (_value: unknown, row: Record<string, unknown>) => (
  <div class="domain-card__actions">
    <a
      class="btn btn--secondary btn--sm"
      href={`/marketing-plans/${row.id}`}
    >
      View
    </a>
    <button
      class="btn btn--secondary btn--sm"
      type="button"
      hx-get={`/marketing-plans/${row.id}/edit`}
      hx-target="#marketing-plans-form-container"
      hx-swap="innerHTML"
    >
      Edit
    </button>
    <button
      class="btn btn--danger btn--sm"
      type="button"
      hx-delete={`/marketing-plans/${row.id}`}
      hx-confirm={`Delete "${row.name}"? This cannot be undone.`}
      hx-swap="none"
    >
      Delete
    </button>
  </div>
);

export const MKTPLAN_TABLE_COLUMNS: ColumnDef[] = [
  {
    key: "name",
    label: "Name",
    sortable: true,
    render: (v, row) => (
      <a href={`/marketing-plans/${row.id}`}>
        <Highlight text={String(v)} q={row._q as string} />
      </a>
    ),
  },
  {
    key: "status",
    label: "Status",
    sortable: true,
    render: statusBadgeRenderer(MKTPLAN_STATUS_VARIANTS),
  },
  {
    key: "budget",
    label: "Budget",
    sortable: true,
    render: (v) => v ? String(v) : "",
  },
  {
    key: "startDate",
    label: "Start",
    sortable: true,
    render: (v) => formatDate(v as string),
  },
  {
    key: "endDate",
    label: "End",
    sortable: true,
    render: (v) => formatDate(v as string),
  },
  { key: "audienceCount", label: "Audiences", sortable: true },
  { key: "channelCount", label: "Channels", sortable: true },
  { key: "campaignCount", label: "Campaigns", sortable: true },
  { key: "goalCount", label: "Goals", sortable: true },
  { key: "_actions", label: "", render: actionBtns },
];

// ---------------------------------------------------------------------------
// Form fields
// ---------------------------------------------------------------------------

export const MKTPLAN_FORM_FIELDS: FieldDef[] = [
  { type: "text", name: "name", label: "Name", required: true, maxLength: 200 },
  {
    type: "select",
    name: "status",
    label: "Status",
    options: MKTPLAN_STATUS_OPTIONS,
  },
  { type: "textarea", name: "description", label: "Description", rows: 3 },
  { type: "number", name: "budgetTotal", label: "Total budget" },
  {
    type: "text",
    name: "budgetCurrency",
    label: "Currency",
    placeholder: "e.g. USD, EUR, CAD",
  },
  {
    type: "autocomplete",
    name: "project",
    label: "Project",
    source: "portfolio",
    placeholder: "Search projects...",
  },
  {
    type: "autocomplete",
    name: "responsible",
    label: "Responsible",
    source: "people",
    placeholder: "Search people...",
  },
  {
    type: "tags",
    name: "team",
    label: "Team",
    source: "people",
    placeholder: "Search people...",
  },
  { type: "date", name: "startDate", label: "Start date" },
  { type: "date", name: "endDate", label: "End date" },
  {
    type: "array-table",
    name: "targetAudiences",
    label: "Audience",
    section: "target_audiences",
    addLabel: "Add audience",
    itemFields: [
      { type: "text", name: "name", label: "Name", placeholder: "Segment" },
      { type: "text", name: "description", label: "Description" },
      {
        type: "text",
        name: "size",
        label: "Size",
        placeholder: "e.g. 10k-50k",
      },
    ],
  },
  {
    type: "array-table",
    name: "channels",
    label: "Channel",
    section: "channels",
    addLabel: "Add channel",
    itemFields: [
      {
        type: "text",
        name: "name",
        label: "Name",
        placeholder: "e.g. Social Media",
      },
      { type: "number", name: "budget", label: "Budget" },
      {
        type: "select",
        name: "status",
        label: "Status",
        options: MKTPLAN_ITEM_STATUS_OPTIONS,
      },
      { type: "text", name: "goals", label: "Goals" },
    ],
  },
  {
    type: "array-table",
    name: "campaigns",
    label: "Campaign",
    section: "campaigns",
    addLabel: "Add campaign",
    itemFields: [
      { type: "text", name: "name", label: "Name" },
      {
        type: "text",
        name: "channel",
        label: "Channel",
        placeholder: "e.g. Social Media",
      },
      { type: "number", name: "budget", label: "Budget" },
      { type: "date", name: "startDate", label: "Start" },
      { type: "date", name: "endDate", label: "End" },
      {
        type: "select",
        name: "status",
        label: "Status",
        options: MKTPLAN_ITEM_STATUS_OPTIONS,
      },
      { type: "text", name: "goals", label: "Goals" },
    ],
  },
  {
    type: "tags",
    name: "linkedGoals",
    label: "Linked Goals",
    source: "goals-by-id",
    placeholder: "Search goals...",
  },
  {
    type: "array-table",
    name: "hypothesis",
    label: "Hypothesis",
    section: "hypothesis",
    addLabel: "Add hypothesis",
    itemFields: [
      { type: "textarea", name: "text", label: "Hypothesis", rows: 2 },
      {
        type: "select",
        name: "verdict",
        label: "Verdict",
        options: [
          { value: "pending", label: "Pending" },
          { value: "confirmed", label: "Confirmed" },
          { value: "partial", label: "Partial" },
          { value: "rejected", label: "Rejected" },
        ],
      },
    ],
  },
  {
    type: "array-table",
    name: "learnings",
    label: "Learning",
    section: "learnings",
    addLabel: "Add learning",
    itemFields: [
      { type: "textarea", name: "text", label: "Learning", rows: 2 },
    ],
  },
  { type: "textarea", name: "notes", label: "Notes", rows: 4 },
];

// ---------------------------------------------------------------------------
// Row mapper
// ---------------------------------------------------------------------------

export function marketingPlanToRow(
  p: MarketingPlan,
): Record<string, unknown> {
  const budget = p.budgetTotal != null
    ? `${p.budgetCurrency ?? ""} ${p.budgetTotal.toLocaleString()}`.trim()
    : "";
  return {
    id: p.id,
    name: p.name,
    status: p.status,
    budget,
    startDate: p.startDate ?? "",
    endDate: p.endDate ?? "",
    audienceCount: p.targetAudiences?.length ?? 0,
    channelCount: p.channels?.length ?? 0,
    campaignCount: p.campaigns?.length ?? 0,
    goalCount: p.linkedGoals?.length ?? 0,
  };
}
