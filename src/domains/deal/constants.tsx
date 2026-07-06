import type { ColumnDef } from "../../components/ui/data-table.tsx";
import type { FieldDef } from "../../components/ui/form-builder.tsx";
import type { Deal } from "../../types/deal.types.ts";
import { DEAL_STAGE_LABELS, DEAL_STAGES } from "../../types/deal.types.ts";
import {
  type BadgeVariant,
  statusBadgeRenderer,
} from "../../components/ui/status-badge.tsx";
import { Highlight } from "../../utils/highlight.tsx";
import { formatDate } from "../../utils/time.ts";
import { createActionBtns } from "../../components/ui/action-btns.tsx";

export const DEAL_STAGE_OPTIONS = DEAL_STAGES.map((s) => ({
  value: s,
  label: DEAL_STAGE_LABELS[s],
}));

export const DEAL_STAGE_VARIANTS: Record<string, BadgeVariant> = {
  "lead": "neutral",
  "qualified": "info",
  "proposal": "accent",
  "negotiation": "warning",
  "closed-won": "success",
  "closed-lost": "error",
};

const actionBtns = createActionBtns("deals", "deals-form-container", {
  nameField: "title",
});

export const DEAL_TABLE_COLUMNS: ColumnDef[] = [
  {
    key: "title",
    label: "Title",
    sortable: true,
    render: (v, row) => (
      <a href={`/deals/${row.id}`}>
        <Highlight text={String(v)} q={row._q as string} />
      </a>
    ),
  },
  {
    key: "stage",
    label: "Stage",
    sortable: true,
    render: (v) => v ? statusBadgeRenderer(DEAL_STAGE_VARIANTS)(v) : "",
  },
  {
    key: "value",
    label: "Value",
    sortable: true,
  },
  {
    key: "company",
    label: "Company",
    sortable: true,
    render: (v, row) =>
      v
        ? (
          <a href={`/companies?q=${encodeURIComponent(String(v))}`}>
            <Highlight text={String(v)} q={row._q as string} />
          </a>
        )
        : "",
  },
  {
    key: "contact",
    label: "Contact",
    sortable: true,
  },
  {
    key: "assignee",
    label: "Assignee",
    sortable: true,
  },
  {
    key: "updated",
    label: "Updated",
    sortable: true,
    render: (v) => formatDate(v as string),
  },
  { key: "_actions", label: "", render: actionBtns },
];

export const DEAL_FORM_FIELDS: FieldDef[] = [
  {
    type: "text",
    name: "title",
    label: "Title",
    required: true,
    maxLength: 200,
  },
  {
    type: "select",
    name: "stage",
    label: "Stage",
    options: DEAL_STAGE_OPTIONS,
  },
  {
    type: "money",
    name: "value",
    label: "Value",
  },
  {
    type: "text",
    name: "currency",
    label: "Currency",
    placeholder: "e.g. CAD",
  },
  {
    type: "text",
    name: "company",
    label: "Company",
    placeholder: "Organization name",
  },
  {
    type: "text",
    name: "contact",
    label: "Contact",
    placeholder: "Primary contact name",
  },
  {
    type: "text",
    name: "assignee",
    label: "Assignee",
    placeholder: "Team member responsible",
  },
  {
    type: "tags",
    name: "tags",
    label: "Tags",
    placeholder: "Type and press Enter...",
  },
  { type: "textarea", name: "description", label: "Description", rows: 4 },
];

export function dealToRow(d: Deal): Record<string, unknown> {
  return {
    id: d.id,
    title: d.title,
    stage: d.stage,
    value: d.value != null ? d.value.toLocaleString() : "",
    company: d.company ?? "",
    contact: d.contact ?? "",
    assignee: d.assignee ?? "",
    updated: d.updatedAt,
  };
}
