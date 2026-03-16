import type { FC } from "hono/jsx";
import { FormBuilder } from "../../components/ui/form-builder.tsx";
import type { FieldDef } from "../../components/ui/form-builder.tsx";

const FIELDS: FieldDef[] = [
  { type: "hidden", id: "milestone-form-id" },
  { type: "text", id: "milestone-form-title", label: "Title", required: true },
  { type: "date", id: "milestone-form-target", label: "Target date" },
  { type: "select", id: "milestone-form-status", label: "Status", options: [
    { value: "open", label: "Open" },
    { value: "completed", label: "Completed" },
  ]},
  { type: "textarea", id: "milestone-form-description", label: "Description", rows: 4 },
  {
    type: "autocomplete",
    id: "milestone-form-project",
    label: "Project",
    sourceUrl: "/api/v1/portfolio",
    displayKey: "name",
    valueKey: "name",
    placeholder: "Search projects...",
  },
];

export const MilestoneForm: FC = () => (
  <FormBuilder id="milestone-form" title="Create Milestone" fields={FIELDS} />
);
