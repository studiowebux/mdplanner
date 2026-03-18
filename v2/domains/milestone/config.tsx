// Milestone domain config — drives the factory for routes, views, and forms.

import type { DomainConfig } from "../../factories/domain.types.ts";
import type {
  CreateMilestone,
  Milestone,
  MilestoneStatus,
  UpdateMilestone,
} from "../../types/milestone.types.ts";
import { MILESTONE_STATUS_OPTIONS } from "../../types/milestone.types.ts";
import {
  getMilestoneService,
  getPortfolioService,
} from "../../singletons/services.ts";
import { MilestoneCard } from "../../views/components/milestone-card.tsx";
import { MILESTONE_TABLE_COLUMNS, milestoneToRow } from "./constants.tsx";
import type { FieldDef } from "../../components/ui/form-builder.tsx";

const FORM_FIELDS: FieldDef[] = [
  { type: "text", name: "name", label: "Title", required: true },
  { type: "date", name: "target", label: "Target date" },
  {
    type: "select",
    name: "status",
    label: "Status",
    options: MILESTONE_STATUS_OPTIONS,
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
      options: MILESTONE_STATUS_OPTIONS,
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

  parseCreate: (body) => ({
    name: String(body.name || ""),
    target: body.target ? String(body.target) : undefined,
    status: (String(body.status) || "open") as MilestoneStatus,
    description: body.description ? String(body.description) : undefined,
    project: body.project ? String(body.project) : undefined,
  }),

  parseUpdate: (body) => ({
    name: body.name ? String(body.name) : undefined,
    target: body.target ? String(body.target) : null,
    status: body.status ? String(body.status) as MilestoneStatus : undefined,
    description: body.description ? String(body.description) : null,
    project: body.project ? String(body.project) : null,
  }),

  getService: () => getMilestoneService(),

  extractFilterOptions: async () => {
    const portfolio = await getPortfolioService().list();
    return {
      project: portfolio.map((p) => p.name).sort(),
    };
  },

  searchPredicate: (item, q) =>
    item.name.toLowerCase().includes(q) ||
    (item.description ?? "").toLowerCase().includes(q) ||
    (item.project ?? "").toLowerCase().includes(q),
};
