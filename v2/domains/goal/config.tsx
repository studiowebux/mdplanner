// Goal domain config — drives the factory for routes, views, and forms.

import type { DomainConfig } from "../../factories/domain.types.ts";
import type { CreateGoal, Goal, UpdateGoal } from "../../types/goal.types.ts";
import { GOAL_STATUSES, GOAL_TYPES } from "../../types/goal.types.ts";
import {
  getGoalService,
  getPeopleService,
  getPortfolioService,
} from "../../singletons/services.ts";
import {
  GOAL_FORM_FIELDS,
  GOAL_TABLE_COLUMNS,
  goalToRow,
} from "./constants.tsx";
import { GoalCard } from "../../views/components/goal-card.tsx";
import { GoalTree } from "../../views/components/goal-tree.tsx";
import { parseFormBody } from "../../utils/form-parser.ts";

/** Name → person ID lookup, refreshed on every list render. */
export let goalPersonByName: Record<string, string> = {};

export const goalConfig: DomainConfig<Goal, CreateGoal, UpdateGoal> = {
  name: "goals",
  singular: "Goal",
  path: "/goals",
  ssePrefix: "goal",
  styles: ["/css/views/goals.css"],
  scripts: ["/js/kpi-gauge.js", "/js/goal-smart.js"],
  emptyMessage: "No goals yet. Create one to get started.",
  defaultView: "table",

  stateKeys: [
    "view",
    "status",
    "type",
    "project",
    "owner",
    "q",
    "sort",
    "order",
    "hideCompleted",
  ],
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
    {
      name: "owner",
      label: "All owners",
      options: [],
    },
  ],

  hideCompleted: { field: "status", value: ["success", "failed"] },

  toRow: goalToRow,

  Card: ({ item, q }) => <GoalCard item={item} q={q} />,

  parseCreate: (body) => parseFormBody(GOAL_FORM_FIELDS, body) as CreateGoal,

  parseUpdate: (body) =>
    parseFormBody(GOAL_FORM_FIELDS, body, {
      clearEmpty: true,
    }) as Partial<UpdateGoal>,

  getService: () => getGoalService(),

  extractFilterOptions: async () => {
    const [portfolio, goals, people] = await Promise.all([
      getPortfolioService().list(),
      getGoalService().list(),
      getPeopleService().list(),
    ]);
    const owners = [
      ...new Set(
        goals.map((g) => g.owner).filter(Boolean) as string[],
      ),
    ].sort();

    // Refresh person name → ID lookup for cards
    const lookup: Record<string, string> = {};
    for (const p of people) lookup[p.name] = p.id;
    goalPersonByName = lookup;

    return {
      project: portfolio.map((p) => p.name).sort(),
      owner: owners,
    };
  },

  searchPredicate: (item, q) =>
    item.title.toLowerCase().includes(q) ||
    (item.description ?? "").toLowerCase().includes(q) ||
    (item.kpi ?? "").toLowerCase().includes(q) ||
    (item.project ?? "").toLowerCase().includes(q),

  extraViewModes: [{ key: "tree", label: "Tree" }],

  customViewRenderer: async (_view, _state, items) => {
    return <GoalTree goals={items} />;
  },
};
