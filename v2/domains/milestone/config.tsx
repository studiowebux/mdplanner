// Milestone domain config — drives the factory for routes, views, and forms.

import type { DomainConfig } from "../../factories/domain.types.ts";
import type {
  CreateMilestone,
  Milestone,
  UpdateMilestone,
} from "../../types/milestone.types.ts";
import {
  getMilestoneService,
  getProjectService,
} from "../../singletons/services.ts";
import { createSearchPredicate } from "../../utils/string.ts";
import { extractProjectNames } from "../../utils/filter-helpers.ts";
import { MilestoneCard } from "../../views/components/milestone-card.tsx";
import { MILESTONE_TABLE_COLUMNS, milestoneToRow } from "./constants.tsx";
import type { FieldDef } from "../../components/ui/form-builder.tsx";
import { parseFormBody } from "../../utils/form-parser.ts";
import { DEFAULT_MILESTONE_STATUSES } from "../../constants/mod.ts";

function statusesToOptions(
  statuses: string[],
): { value: string; label: string }[] {
  return statuses.map((s) => ({
    value: s,
    label: s.charAt(0).toUpperCase() + s.slice(1),
  }));
}

const FORM_FIELDS: FieldDef[] = [
  {
    type: "text",
    name: "name",
    label: "Title",
    required: true,
    maxLength: 200,
  },
  { type: "date", name: "target", label: "Target date" },
  {
    type: "select",
    name: "status",
    label: "Status",
    // Placeholder options — overridden at render time by extractFormOptions.
    options: statusesToOptions(DEFAULT_MILESTONE_STATUSES),
  },
  { type: "textarea", name: "description", label: "Description", rows: 4 },
  {
    type: "autocomplete",
    name: "project",
    label: "Project",
    source: "portfolio",
    placeholder: "Search projects...",
  },
];

export const milestoneConfig: DomainConfig<
  Milestone,
  CreateMilestone,
  UpdateMilestone
> = {
  name: "milestones",
  singular: "Milestone",
  path: "/milestones",
  ssePrefix: "milestone",
  styles: ["/css/views/milestones.css"],
  emptyMessage: "No milestones yet. Create one to get started.",

  stateKeys: [
    "view",
    "status",
    "project",
    "q",
    "hideCompleted",
    "sort",
    "order",
  ],
  columns: MILESTONE_TABLE_COLUMNS,
  formFields: FORM_FIELDS,

  filters: [
    {
      name: "status",
      label: "All statuses",
      // Placeholder — overridden by extractFilterOptions at list render time.
      options: statusesToOptions(DEFAULT_MILESTONE_STATUSES),
    },
    {
      name: "project",
      label: "All projects",
      options: [],
    },
  ],

  hideCompleted: { field: "status", value: "completed" },

  toRow: milestoneToRow,

  Card: ({ item, q }) => <MilestoneCard milestone={item} q={q} />,

  parseCreate: (body) => parseFormBody(FORM_FIELDS, body) as CreateMilestone,

  parseUpdate: (body) =>
    parseFormBody(FORM_FIELDS, body, {
      clearEmpty: true,
    }) as Partial<UpdateMilestone>,

  getService: () => getMilestoneService(),

  extractFormOptions: async () => {
    const config = await getProjectService().getConfig();
    const statuses = config.milestoneStatuses ?? DEFAULT_MILESTONE_STATUSES;
    return { status: statusesToOptions(statuses) };
  },

  extractFilterOptions: async () => {
    const config = await getProjectService().getConfig();
    const statuses = config.milestoneStatuses ?? DEFAULT_MILESTONE_STATUSES;
    return {
      status: statusesToOptions(statuses),
      project: await extractProjectNames(),
    };
  },

  searchPredicate: createSearchPredicate<Milestone>([
    { type: "string", get: (i) => i.name },
    { type: "string", get: (i) => i.description },
    { type: "string", get: (i) => i.project },
  ]),
};
