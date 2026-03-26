// Goal domain config — drives the factory for routes, views, and forms.

import type { DomainConfig } from "../../factories/domain.types.ts";
import type { CreateGoal, Goal, UpdateGoal } from "../../types/goal.types.ts";
import { GOAL_STATUSES, GOAL_TYPES } from "../../types/goal.types.ts";
import {
  getGoalService,
  getPortfolioService,
} from "../../singletons/services.ts";
import {
  GOAL_FORM_FIELDS,
  GOAL_TABLE_COLUMNS,
  goalToRow,
} from "./constants.tsx";
import { GoalCard } from "../../views/components/goal-card.tsx";
import { parseFormBody } from "../../utils/form-parser.ts";

export const goalConfig: DomainConfig<Goal, CreateGoal, UpdateGoal> = {
  name: "goals",
  singular: "Goal",
  path: "/goals",
  ssePrefix: "goal",
  styles: ["/css/views/goals.css"],
  emptyMessage: "No goals yet. Create one to get started.",
  defaultView: "table",

  stateKeys: ["view", "status", "type", "project", "q", "sort", "order"],
  columns: GOAL_TABLE_COLUMNS,
  formFields: GOAL_FORM_FIELDS,

  filters: [
    {
      name: "status",
      label: "All statuses",
      options: GOAL_STATUSES.map((s) => ({ value: s, label: s })),
    },
    {
      name: "type",
      label: "All types",
      options: GOAL_TYPES.map((t) => ({ value: t, label: t })),
    },
    {
      name: "project",
      label: "All projects",
      options: [],
    },
  ],

  hideCompleted: { field: "status", value: "success" },

  toRow: goalToRow,

  Card: ({ item, q }) => <GoalCard item={item} q={q} />,

  parseCreate: (body) => parseFormBody(GOAL_FORM_FIELDS, body) as CreateGoal,

  parseUpdate: (body) =>
    parseFormBody(GOAL_FORM_FIELDS, body, {
      clearEmpty: true,
    }) as Partial<UpdateGoal>,

  getService: () => getGoalService(),

  extractFilterOptions: async () => {
    const portfolio = await getPortfolioService().list();
    return {
      project: portfolio.map((p) => p.name).sort(),
    };
  },

  searchPredicate: (item, q) =>
    item.title.toLowerCase().includes(q) ||
    (item.description ?? "").toLowerCase().includes(q) ||
    (item.kpi ?? "").toLowerCase().includes(q) ||
    (item.project ?? "").toLowerCase().includes(q),
};
