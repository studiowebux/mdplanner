// Risk domain config — drives the factory for routes, views, and forms.

import type { DomainConfig } from "../../factories/domain.types.ts";
import type {
  CreateRisk,
  Risk,
  UpdateRisk,
} from "../../types/risk.types.ts";
import { getRiskService } from "../../singletons/services.ts";
import { createSearchPredicate } from "../../utils/string.ts";
import {
  RISK_FORM_FIELDS,
  RISK_TABLE_COLUMNS,
  riskToRow,
} from "./constants.tsx";
import { RiskCard } from "../../views/components/risk-card.tsx";
import { parseFormBody } from "../../utils/form-parser.ts";

export const riskConfig: DomainConfig<Risk, CreateRisk, UpdateRisk> = {
  name: "risks",
  singular: "Risk",
  plural: "Risks",
  path: "/risks",
  ssePrefix: "risk",
  styles: ["/css/views/risks.css"],
  emptyMessage: "No risks yet. Create one to get started.",
  defaultView: "table",

  stateKeys: [
    "view",
    "category",
    "status",
    "project",
    "q",
    "sort",
    "order",
  ],
  columns: RISK_TABLE_COLUMNS,
  formFields: RISK_FORM_FIELDS,

  filters: [
    {
      name: "category",
      label: "All categories",
      options: [],
    },
    {
      name: "status",
      label: "All statuses",
      options: [],
    },
    {
      name: "project",
      label: "All projects",
      options: [],
    },
  ],

  toRow: riskToRow,

  Card: ({ item, q }) => <RiskCard item={item} q={q} />,

  parseCreate: (body) => {
    const parsed = parseFormBody(RISK_FORM_FIELDS, body) as CreateRisk;
    return {
      ...parsed,
      likelihood: Number(parsed.likelihood ?? 3),
      impact: Number(parsed.impact ?? 3),
    };
  },

  parseUpdate: (body) => {
    const parsed = parseFormBody(RISK_FORM_FIELDS, body, {
      clearEmpty: true,
    }) as Partial<UpdateRisk>;
    if (parsed.likelihood !== undefined) {
      parsed.likelihood = Number(parsed.likelihood);
    }
    if (parsed.impact !== undefined) {
      parsed.impact = Number(parsed.impact);
    }
    return parsed;
  },

  getService: () => getRiskService(),
  projectField: "project",

  extractFilterOptions: async () => {
    const items = await getRiskService().list();
    const categories = [
      ...new Set(items.map((r) => r.category).filter(Boolean) as string[]),
    ].sort();
    const statuses = [
      ...new Set(items.map((r) => r.status).filter(Boolean) as string[]),
    ].sort();
    const projects = [
      ...new Set(
        items.map((r) => r.project).filter(Boolean) as string[],
      ),
    ].sort();
    return { category: categories, status: statuses, project: projects };
  },

  searchPredicate: createSearchPredicate<Risk>([
    { type: "string", get: (r) => r.title },
    { type: "string", get: (r) => r.description },
    { type: "string", get: (r) => r.mitigation },
    { type: "string", get: (r) => r.owner },
  ]),
};
