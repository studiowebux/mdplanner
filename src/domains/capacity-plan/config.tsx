// Capacity plan domain config — drives factory routes, views, and forms.

import type { AppContext } from "../../types/app.ts";
import type {
  DomainConfig,
  DomainFilterState,
} from "../../factories/domain.types.ts";
import type {
  CapacityPlan,
  CreateCapacityPlan,
  UpdateCapacityPlan,
} from "../../types/capacity-plan.types.ts";
import {
  getCapacityPlanService,
  getPeopleService,
  getPortfolioService,
} from "../../singletons/services.ts";
import { createSearchPredicate } from "../../utils/string.ts";
import {
  CAPACITY_PLAN_FORM_FIELDS,
  CAPACITY_PLAN_TABLE_COLUMNS,
  capacityPlanToRow,
} from "./constants.tsx";
import { CapacityPlanCard } from "../../views/components/capacity-plan-card.tsx";
import { parseFormBody } from "../../utils/form-parser.ts";

// ---------------------------------------------------------------------------
// Computed status — derived from startDate / endDate vs today.
// ---------------------------------------------------------------------------

type CapacityStatus = "active" | "upcoming" | "past" | "undated";

const STATUS_LABELS: Record<CapacityStatus, string> = {
  active: "Active",
  upcoming: "Upcoming",
  past: "Past",
  undated: "Undated",
};

/** Today as YYYY-MM-DD (lex-comparable to startDate/endDate). */
function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Derive a plan's lifecycle status from its date window. */
function planStatus(p: CapacityPlan): CapacityStatus {
  const start = p.startDate ?? "";
  const end = p.endDate ?? "";
  if (!start && !end) return "undated";
  const today = todayISO();
  if (start && start > today) return "upcoming";
  if (end && end < today) return "past";
  return "active";
}

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

  stateKeys: [
    "view",
    "status",
    "member",
    "project",
    "q",
    "sort",
    "order",
  ],
  columns: CAPACITY_PLAN_TABLE_COLUMNS,
  formFields: CAPACITY_PLAN_FORM_FIELDS,

  filters: [
    {
      name: "status",
      label: "All statuses",
      options: (Object.keys(STATUS_LABELS) as CapacityStatus[]).map((k) => ({
        value: k,
        label: STATUS_LABELS[k],
      })),
      computed: true,
    },
    {
      name: "member",
      label: "All members",
      options: [],
      computed: true,
    },
    {
      name: "project",
      label: "All projects",
      options: [],
      computed: true,
    },
  ],

  toRow: capacityPlanToRow,

  Card: ({ item, q }) => <CapacityPlanCard item={item} q={q} />,

  parseCreate: (body) =>
    parseFormBody(CAPACITY_PLAN_FORM_FIELDS, body) as CreateCapacityPlan,

  parseUpdate: (body) =>
    parseFormBody(CAPACITY_PLAN_FORM_FIELDS, body, {
      clearEmpty: true,
    }) as Partial<UpdateCapacityPlan>,

  getService: () => getCapacityPlanService(),

  extractFilterOptions: async (items) => {
    // Collect referenced person IDs from teamMembers + allocations.
    const memberIds = new Set<string>();
    const projectIds = new Set<string>();
    for (const p of items) {
      for (const m of p.teamMembers ?? []) {
        if (m.personId) memberIds.add(m.personId);
      }
      for (const a of p.allocations ?? []) {
        if (a.targetType === "project" && a.targetId) {
          projectIds.add(a.targetId);
        }
      }
    }

    const [people, portfolio] = await Promise.all([
      getPeopleService().list(),
      getPortfolioService().list(),
    ]);
    const personName = new Map(people.map((p) => [p.id, p.name]));
    const portfolioName = new Map(portfolio.map((p) => [p.id, p.name]));

    const memberOptions = [...memberIds]
      .map((id) => ({ value: id, label: personName.get(id) ?? id }))
      .sort((a, b) => a.label.localeCompare(b.label));
    const projectOptions = [...projectIds]
      .map((id) => ({ value: id, label: portfolioName.get(id) ?? id }))
      .sort((a, b) => a.label.localeCompare(b.label));

    return {
      member: memberOptions,
      project: projectOptions,
    };
  },

  customFilter: async (items: CapacityPlan[], c: AppContext) => {
    const state = c.get("filterState" as never) as DomainFilterState;
    if (!state) return items;
    let result = items;

    const status = state.status as string | undefined;
    if (status) {
      result = result.filter((p) => planStatus(p) === status);
    }

    const member = state.member as string | undefined;
    if (member) {
      result = result.filter((p) =>
        (p.teamMembers ?? []).some((m) => m.personId === member)
      );
    }

    const project = state.project as string | undefined;
    if (project) {
      result = result.filter((p) =>
        (p.allocations ?? []).some(
          (a) => a.targetType === "project" && a.targetId === project,
        )
      );
    }

    return result;
  },

  searchPredicate: createSearchPredicate<CapacityPlan>([
    { type: "string", get: (p) => p.title },
    { type: "string", get: (p) => p.startDate ?? "" },
  ]),
};
