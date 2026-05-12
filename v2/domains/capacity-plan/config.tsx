// Capacity plan domain config — drives factory routes, views, and forms.

import type { DomainConfig } from "../../factories/domain.types.ts";
import type {
  CapacityPlan,
  CreateCapacityPlan,
  UpdateCapacityPlan,
} from "../../types/capacity-plan.types.ts";
import { getCapacityPlanService } from "../../singletons/services.ts";
import { createSearchPredicate } from "../../utils/string.ts";
import {
  CAPACITY_PLAN_FORM_FIELDS,
  CAPACITY_PLAN_TABLE_COLUMNS,
  capacityPlanToRow,
} from "./constants.tsx";
import { CapacityPlanCard } from "../../views/components/capacity-plan-card.tsx";
import { parseFormBody } from "../../utils/form-parser.ts";

export const capacityPlanConfig: DomainConfig<
  CapacityPlan,
  CreateCapacityPlan,
  UpdateCapacityPlan
> = {
  name: "capacity-plans",
  singular: "Capacity Plan",
  path: "/capacity-plans",
  ssePrefix: "capacity-plan",
  styles: ["/css/views/capacity-plans.css"],
  scripts: ["/js/capacity-plan-bandwidth.js"],
  emptyMessage: "No capacity plans yet. Create one to get started.",
  defaultView: "table",

  stateKeys: ["view", "q", "sort", "order"],
  columns: CAPACITY_PLAN_TABLE_COLUMNS,
  formFields: CAPACITY_PLAN_FORM_FIELDS,
  filters: [],

  toRow: capacityPlanToRow,

  Card: ({ item, q }) => <CapacityPlanCard item={item} q={q} />,

  parseCreate: (body) =>
    parseFormBody(CAPACITY_PLAN_FORM_FIELDS, body) as CreateCapacityPlan,

  parseUpdate: (body) =>
    parseFormBody(CAPACITY_PLAN_FORM_FIELDS, body, {
      clearEmpty: true,
    }) as Partial<UpdateCapacityPlan>,

  getService: () => getCapacityPlanService(),

  searchPredicate: createSearchPredicate<CapacityPlan>([
    { type: "string", get: (p) => p.title },
    { type: "string", get: (p) => p.startDate ?? "" },
  ]),
};
