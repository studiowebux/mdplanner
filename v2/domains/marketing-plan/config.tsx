// Marketing Plan domain config — drives the factory for routes, views, and forms.

import type { DomainConfig } from "../../factories/domain.types.ts";
import type {
  CreateMarketingPlan,
  MarketingPlan,
  UpdateMarketingPlan,
} from "../../types/marketing-plan.types.ts";
import { MARKETING_PLAN_COMPLETED_STATUSES } from "../../types/marketing-plan.types.ts";
import {
  getGoalService,
  getMarketingPlanService,
  getPeopleService,
} from "../../singletons/services.ts";
import { createSearchPredicate } from "../../utils/string.ts";
import {
  marketingPlanToRow,
  MKTPLAN_FORM_FIELDS,
  MKTPLAN_STATUS_OPTIONS,
  MKTPLAN_TABLE_COLUMNS,
} from "./constants.tsx";
import { MarketingPlanCard } from "../../views/components/marketing-plan-card.tsx";
import { parseFormBody } from "../../utils/form-parser.ts";

export const marketingPlanConfig: DomainConfig<
  MarketingPlan,
  CreateMarketingPlan,
  UpdateMarketingPlan
> = {
  name: "marketing-plans",
  singular: "Marketing Plan",
  plural: "Marketing Plans",
  path: "/marketing-plans",
  ssePrefix: "marketing-plan",
  styles: ["/css/views/marketing-plans.css"],
  scripts: ["/js/kpi-gauge.js"],
  emptyMessage: "No marketing plans yet. Create one to get started.",
  defaultView: "table",

  stateKeys: [
    "view",
    "status",
    "q",
    "sort",
    "order",
    "hideCompleted",
  ],
  columns: MKTPLAN_TABLE_COLUMNS,
  formFields: MKTPLAN_FORM_FIELDS,

  filters: [
    {
      name: "status",
      label: "All statuses",
      options: MKTPLAN_STATUS_OPTIONS,
    },
  ],

  hideCompleted: {
    field: "status",
    value: [...MARKETING_PLAN_COMPLETED_STATUSES],
  },

  toRow: marketingPlanToRow,

  Card: ({ item, q }) => <MarketingPlanCard item={item} q={q} />,

  parseCreate: (body) =>
    parseFormBody(MKTPLAN_FORM_FIELDS, body) as CreateMarketingPlan,

  parseUpdate: (body) =>
    parseFormBody(MKTPLAN_FORM_FIELDS, body, {
      clearEmpty: true,
    }) as Partial<UpdateMarketingPlan>,

  getService: () => getMarketingPlanService(),

  resolveFormValues: async (values) => {
    const resolved = { ...values };
    if (values.responsible) {
      const person = await getPeopleService().getById(values.responsible);
      if (person) resolved.responsible = person.name;
    }
    if (values.team) {
      const ids = values.team.split(",").filter(Boolean);
      const names: string[] = [];
      for (const id of ids) {
        const person = await getPeopleService().getById(id.trim());
        if (person) names.push(person.name);
      }
      if (names.length) resolved.team = names.join(", ");
    }
    if (values.linkedGoals) {
      const ids = values.linkedGoals.split(",").filter(Boolean);
      const titles: string[] = [];
      for (const id of ids) {
        const goal = await getGoalService().getById(id.trim());
        if (goal) titles.push(goal.title);
      }
      if (titles.length) resolved.linkedGoals = titles.join(", ");
    }
    return resolved;
  },

  searchPredicate: createSearchPredicate<MarketingPlan>([
    { type: "string", get: (i) => i.name },
    { type: "string", get: (i) => i.description },
    { type: "string", get: (i) => i.notes },
  ]),
};
