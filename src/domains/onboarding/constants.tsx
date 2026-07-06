import type { ColumnDef } from "../../components/ui/data-table.tsx";
import type { FieldDef } from "../../components/ui/form-builder.tsx";
import type { Onboarding } from "../../types/onboarding.types.ts";
import {
  ONBOARDING_STEP_CATEGORIES,
  ONBOARDING_STEP_STATUSES,
} from "../../types/onboarding.types.ts";
import { createActionBtns } from "../../components/ui/action-btns.tsx";
import { Highlight } from "../../utils/highlight.tsx";
import { formatDate } from "../../utils/time.ts";

// ---------------------------------------------------------------------------
// Action buttons
// ---------------------------------------------------------------------------

const actionBtns = createActionBtns(
  "onboarding",
  "onboarding-form-container",
);

// ---------------------------------------------------------------------------
// Derived display helpers
// ---------------------------------------------------------------------------

function completionBadge(item: Onboarding): string {
  if (item.steps.length === 0) return "No steps";
  const done = item.steps.filter((s) => s.status === "complete").length;
  return `${done}/${item.steps.length}`;
}

// ---------------------------------------------------------------------------
// Table columns
// ---------------------------------------------------------------------------

export const ONBOARDING_TABLE_COLUMNS: ColumnDef[] = [
  {
    key: "employeeName",
    label: "Employee",
    sortable: true,
    render: (v, row) => (
      <a href={`/onboarding/${row.id}`}>
        <Highlight text={String(v)} q={row._q as string} />
      </a>
    ),
  },
  {
    key: "role",
    label: "Role",
    sortable: true,
  },
  {
    key: "startDateDisplay",
    label: "Start Date",
    sortable: true,
  },
  {
    key: "completionDisplay",
    label: "Progress",
    sortable: false,
  },
  {
    key: "createdAtDisplay",
    label: "Created",
    sortable: true,
  },
  { key: "_actions", label: "", render: actionBtns },
];

// ---------------------------------------------------------------------------
// Form fields
// ---------------------------------------------------------------------------

export const ONBOARDING_FORM_FIELDS: FieldDef[] = [
  {
    type: "autocomplete",
    name: "employeeName",
    label: "Employee Name",
    source: "people-names",
    required: true,
    placeholder: "Search people or type a name...",
    freetext: true,
  },
  {
    type: "autocomplete",
    name: "personId",
    label: "Onboardee",
    source: "people",
    placeholder: "Pick the person being onboarded...",
  },
  {
    type: "text",
    name: "role",
    label: "Role / Job Title",
    required: true,
    maxLength: 200,
  },
  {
    type: "date",
    name: "startDate",
    label: "Start Date",
  },
  {
    type: "textarea",
    name: "notes",
    label: "Notes",
    rows: 4,
  },
  {
    // Optional convenience — seeds the steps below from a template's step list.
    // Placeholder options; overridden at render by config.extractFormOptions.
    type: "select",
    name: "templateId",
    label: "Seed from template",
    options: [{ value: "", label: "— None (enter steps manually) —" }],
    hx: {
      get: "/onboarding/template-steps",
      target: "#onboarding-form-steps-rows",
    },
  },
  {
    type: "array-table",
    name: "steps",
    label: "Step",
    section: "onboarding_steps",
    addLabel: "Add step",
    itemFields: [
      { type: "hidden", name: "id" },
      {
        type: "text",
        name: "title",
        label: "Title",
        placeholder: "e.g. Laptop & equipment setup",
      },
      {
        type: "select",
        name: "category",
        label: "Category",
        options: [
          { value: "equipment", label: "Equipment" },
          { value: "accounts", label: "Accounts" },
          { value: "docs", label: "Docs" },
          { value: "training", label: "Training" },
          { value: "intro", label: "Intro" },
          { value: "other", label: "Other" },
        ],
      },
      {
        type: "select",
        name: "status",
        label: "Status",
        options: [
          { value: "not_started", label: "Not started" },
          { value: "in_progress", label: "In progress" },
          { value: "complete", label: "Complete" },
        ],
      },
      {
        type: "autocomplete",
        name: "owner",
        label: "Owner",
        source: "people",
        placeholder: "Pick owner...",
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Step category / status options (for detail page UI)
// ---------------------------------------------------------------------------

export const STEP_CATEGORY_LABELS: Record<
  (typeof ONBOARDING_STEP_CATEGORIES)[number],
  string
> = {
  equipment: "Equipment",
  accounts: "Accounts",
  docs: "Docs",
  training: "Training",
  intro: "Intro",
  other: "Other",
};

export const STEP_STATUS_LABELS: Record<
  (typeof ONBOARDING_STEP_STATUSES)[number],
  string
> = {
  not_started: "Not started",
  in_progress: "In progress",
  complete: "Complete",
};

// ---------------------------------------------------------------------------
// Row mapper
// ---------------------------------------------------------------------------

export function onboardingToRow(
  item: Onboarding,
): Record<string, unknown> {
  return {
    id: item.id,
    employeeName: item.employeeName,
    role: item.role,
    startDateDisplay: item.startDate ?? "",
    completionDisplay: completionBadge(item),
    createdAtDisplay: formatDate(item.createdAt),
  };
}
