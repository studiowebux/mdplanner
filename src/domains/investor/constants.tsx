import type { ColumnDef } from "../../components/ui/data-table.tsx";
import type { FieldDef } from "../../components/ui/form-builder.tsx";
import type { Investor } from "../../types/investor.types.ts";
import {
  INVESTOR_STAGES,
  INVESTOR_STATUSES,
  INVESTOR_TYPES,
} from "../../types/investor.types.ts";
import { createActionBtns } from "../../components/ui/action-btns.tsx";
import { Highlight } from "../../utils/highlight.tsx";
import {
  type BadgeVariant,
  statusBadgeRenderer,
} from "../../components/ui/status-badge.tsx";

// ---------------------------------------------------------------------------
// Badge variants
// ---------------------------------------------------------------------------

export const INVESTOR_TYPE_VARIANTS: Record<string, BadgeVariant> = {
  vc: "info",
  angel: "teal",
  family_office: "neutral",
  corporate: "warning",
  accelerator: "success",
};

export const INVESTOR_STAGE_VARIANTS: Record<string, BadgeVariant> = {
  lead: "info",
  associate: "teal",
  partner: "warning",
  passed: "neutral",
};

export const INVESTOR_STATUS_VARIANTS: Record<string, BadgeVariant> = {
  not_started: "neutral",
  in_progress: "info",
  term_sheet: "warning",
  passed: "error",
  invested: "success",
};

// ---------------------------------------------------------------------------
// Human-readable labels
// ---------------------------------------------------------------------------

export const INVESTOR_TYPE_LABELS: Record<string, string> = {
  vc: "VC",
  angel: "Angel",
  family_office: "Family Office",
  corporate: "Corporate",
  accelerator: "Accelerator",
};

export const INVESTOR_STAGE_LABELS: Record<string, string> = {
  lead: "Lead",
  associate: "Associate",
  partner: "Partner",
  passed: "Passed",
};

export const INVESTOR_STATUS_LABELS: Record<string, string> = {
  not_started: "Not Started",
  in_progress: "In Progress",
  term_sheet: "Term Sheet",
  passed: "Passed",
  invested: "Invested",
};

// ---------------------------------------------------------------------------
// Filter options
// ---------------------------------------------------------------------------

export const INVESTOR_TYPE_OPTIONS = INVESTOR_TYPES.map((t) => ({
  value: t,
  label: INVESTOR_TYPE_LABELS[t],
}));

export const INVESTOR_STAGE_OPTIONS = INVESTOR_STAGES.map((s) => ({
  value: s,
  label: INVESTOR_STAGE_LABELS[s],
}));

export const INVESTOR_STATUS_OPTIONS = INVESTOR_STATUSES.map((s) => ({
  value: s,
  label: INVESTOR_STATUS_LABELS[s],
}));

// ---------------------------------------------------------------------------
// Table columns
// ---------------------------------------------------------------------------

const actionBtns = createActionBtns(
  "investors",
  "investors-form-container",
);

export const INVESTOR_TABLE_COLUMNS: ColumnDef[] = [
  {
    key: "name",
    label: "Name",
    sortable: true,
    render: (v, row) => (
      <a href={`/investors/${row.id}`}>
        <Highlight text={String(v)} q={row._q as string} />
      </a>
    ),
  },
  {
    key: "type",
    label: "Type",
    sortable: true,
    render: statusBadgeRenderer(INVESTOR_TYPE_VARIANTS, INVESTOR_TYPE_LABELS),
  },
  {
    key: "stage",
    label: "Stage",
    sortable: true,
    render: statusBadgeRenderer(INVESTOR_STAGE_VARIANTS, INVESTOR_STAGE_LABELS),
  },
  {
    key: "status",
    label: "Status",
    sortable: true,
    render: statusBadgeRenderer(
      INVESTOR_STATUS_VARIANTS,
      INVESTOR_STATUS_LABELS,
    ),
  },
  { key: "contact", label: "Contact", sortable: true },
  { key: "amountTarget", label: "Target ($)", sortable: true },
  { key: "_actions", label: "", render: actionBtns },
];

// ---------------------------------------------------------------------------
// Form fields
// ---------------------------------------------------------------------------

export const INVESTOR_FORM_FIELDS: FieldDef[] = [
  {
    type: "text",
    name: "name",
    label: "Name",
    required: true,
    maxLength: 200,
  },
  {
    type: "select",
    name: "type",
    label: "Type",
    required: true,
    options: INVESTOR_TYPES.map((t) => ({
      value: t,
      label: INVESTOR_TYPE_LABELS[t],
    })),
  },
  {
    type: "select",
    name: "stage",
    label: "Stage",
    required: true,
    options: INVESTOR_STAGES.map((s) => ({
      value: s,
      label: INVESTOR_STAGE_LABELS[s],
    })),
  },
  {
    type: "select",
    name: "status",
    label: "Status",
    required: true,
    options: INVESTOR_STATUSES.map((s) => ({
      value: s,
      label: INVESTOR_STATUS_LABELS[s],
    })),
  },
  {
    type: "money",
    name: "amountTarget",
    label: "Target Amount ($)",
  },
  {
    type: "text",
    name: "contact",
    label: "Contact",
  },
  {
    type: "date",
    name: "introDate",
    label: "Intro Date",
  },
  {
    type: "date",
    name: "lastContact",
    label: "Last Contact",
  },
  {
    type: "textarea",
    name: "notes",
    label: "Notes",
    rows: 5,
  },
  {
    type: "text",
    name: "tags",
    label: "Tags (comma-separated)",
  },
];

// ---------------------------------------------------------------------------
// Row mapper
// ---------------------------------------------------------------------------

export function investorToRow(inv: Investor): Record<string, unknown> {
  return {
    id: inv.id,
    name: inv.name,
    type: inv.type,
    stage: inv.stage,
    status: inv.status,
    contact: inv.contact ?? "",
    amountTarget: inv.amountTarget != null
      ? inv.amountTarget.toLocaleString()
      : "",
  };
}
