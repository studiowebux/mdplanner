import type { FC } from "hono/jsx";
import { FormBuilder } from "../../components/ui/form-builder.tsx";
import type { FieldDef } from "../../components/ui/form-builder.tsx";
import type { MilestoneBase } from "../../types/milestone.types.ts";

const FIELDS: FieldDef[] = [
  { type: "text", name: "name", label: "Title", required: true },
  { type: "date", name: "target", label: "Target date" },
  {
    type: "select",
    name: "status",
    label: "Status",
    options: [
      { value: "open", label: "Open" },
      { value: "completed", label: "Completed" },
    ],
  },
  { type: "textarea", name: "description", label: "Description", rows: 4 },
  {
    type: "autocomplete",
    name: "project",
    label: "Project",
    sourceUrl: "/api/v1/portfolio",
    displayKey: "name",
    valueKey: "name",
    placeholder: "Search projects...",
  },
];

type Props = {
  milestone?: MilestoneBase;
};

export const MilestoneForm: FC<Props> = ({ milestone }) => {
  const isEdit = !!milestone;
  return (
    <FormBuilder
      id="milestone-form"
      title={isEdit ? "Edit Milestone" : "Create Milestone"}
      fields={FIELDS}
      values={isEdit
        ? {
          name: milestone.name,
          target: milestone.target ?? "",
          status: milestone.status,
          description: milestone.description ?? "",
          project: milestone.project ?? "",
        }
        : undefined}
      action={isEdit ? `/milestones/${milestone.id}/edit` : "/milestones/new"}
      method="post"
      open
    />
  );
};
