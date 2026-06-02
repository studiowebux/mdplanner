import type { ColumnDef } from "../../components/ui/data-table.tsx";
import type { FieldDef } from "../../components/ui/form-builder.tsx";
import type { OnboardingTemplate } from "../../types/onboarding-template.types.ts";
import { createActionBtns } from "../../components/ui/action-btns.tsx";
import { Highlight } from "../../utils/highlight.tsx";
import { formatDate } from "../../utils/time.ts";

// ---------------------------------------------------------------------------
// Action buttons
// ---------------------------------------------------------------------------

const actionBtns = createActionBtns(
  "onboarding-templates",
  "onboarding-templates-form-container",
);

// ---------------------------------------------------------------------------
// Table columns
// ---------------------------------------------------------------------------

export const ONBOARDING_TEMPLATE_TABLE_COLUMNS: ColumnDef[] = [
  {
    key: "name",
    label: "Name",
    sortable: true,
    render: (v, row) => (
      <a href={`/onboarding-templates/${row.id}`}>
        <Highlight text={String(v)} q={row._q as string} />
      </a>
    ),
  },
  {
    key: "roleDisplay",
    label: "Role",
    sortable: true,
  },
  {
    key: "tagsDisplay",
    label: "Tags",
    sortable: false,
  },
  {
    key: "stepCount",
    label: "Steps",
    sortable: true,
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

export const ONBOARDING_TEMPLATE_FORM_FIELDS: FieldDef[] = [
  {
    type: "text",
    name: "name",
    label: "Template Name",
    required: true,
    maxLength: 200,
  },
  {
    type: "text",
    name: "role",
    label: "Target Role",
    placeholder: "e.g. Software Engineer",
  },
  {
    type: "tags",
    name: "tags",
    label: "Tags",
    placeholder: "Add tag and press Enter...",
  },
  {
    type: "textarea",
    name: "description",
    label: "Description",
    rows: 3,
  },
  {
    type: "array-table",
    name: "steps",
    label: "Step",
    section: "onboarding_template_steps",
    addLabel: "Add step",
    itemFields: [
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
    ],
  },
];

// ---------------------------------------------------------------------------
// Row mapper
// ---------------------------------------------------------------------------

export function onboardingTemplateToRow(
  t: OnboardingTemplate,
): Record<string, unknown> {
  return {
    id: t.id,
    name: t.name,
    roleDisplay: t.role ?? "",
    tagsDisplay: t.tags?.join(", ") ?? "",
    stepCount: t.steps.length,
    createdAtDisplay: formatDate(t.createdAt),
  };
}
