// Risk domain config — drives the factory for routes, views, and forms.

import type { DomainConfig } from "../../factories/domain.types.ts";
import type { CreateRisk, Risk, UpdateRisk } from "../../types/risk.types.ts";
import { getRiskService } from "../../singletons/services.ts";
import { createSearchPredicate } from "../../utils/string.ts";
import {
  RISK_FORM_FIELDS,
  RISK_STATUS_VARIANTS,
  RISK_TABLE_COLUMNS,
  riskToRow,
} from "./constants.tsx";
import { RiskCard } from "../../views/components/risk-card.tsx";
import { parseFormBody } from "../../utils/form-parser.ts";
import { badgeClass } from "../../components/ui/status-badge.tsx";

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

  extraViewModes: [{ key: "matrix", label: "Matrix" }],

  customViewRenderer: async (_view, _state, items) => {
    // Score zones: 1–4 low, 5–9 medium, 10–16 high, 17–25 critical
    function scoreZone(l: number, i: number): string {
      const score = l * i;
      if (score >= 17) return "risk-matrix__cell--critical";
      if (score >= 10) return "risk-matrix__cell--high";
      if (score >= 5) return "risk-matrix__cell--medium";
      return "risk-matrix__cell--low";
    }

    const cells = [];
    // Impact on Y: 5 at top → 1 at bottom
    for (let impact = 5; impact >= 1; impact--) {
      for (let likelihood = 1; likelihood <= 5; likelihood++) {
        const matching = items.filter(
          (r) => r.likelihood === likelihood && r.impact === impact,
        );
        cells.push(
          <div
            class={`risk-matrix__cell ${scoreZone(likelihood, impact)}`}
            data-l={likelihood}
            data-i={impact}
          >
            {matching.map((r) => (
              <a
                href={`/risks/${r.id}`}
                class={`risk-matrix__chip`}
                title={r.title}
              >
                <span class="risk-matrix__chip-title">{r.title}</span>
                <span class={badgeClass(RISK_STATUS_VARIANTS, r.status)}>
                  {r.status}
                </span>
              </a>
            ))}
          </div>,
        );
      }
    }

    return (
      <div class="risk-matrix">
        <div class="risk-matrix__y-label">
          <span>&#8593; Impact</span>
        </div>
        <div class="risk-matrix__grid-wrap">
          <div class="risk-matrix__y-ticks">
            {[5, 4, 3, 2, 1].map((n) => (
              <span class="risk-matrix__tick">{n}</span>
            ))}
          </div>
          <div class="risk-matrix__grid">
            {cells}
          </div>
        </div>
        <div class="risk-matrix__x-axis">
          <div class="risk-matrix__x-offset">
            <div class="risk-matrix__x-ticks">
              {[1, 2, 3, 4, 5].map((n) => (
                <span class="risk-matrix__tick">{n}</span>
              ))}
            </div>
            <div class="risk-matrix__x-label">Likelihood &#8594;</div>
          </div>
        </div>
        <div class="risk-matrix__legend">
          <span class="risk-matrix__legend-item risk-matrix__legend-item--low">
            Low (1–4)
          </span>
          <span class="risk-matrix__legend-item risk-matrix__legend-item--medium">
            Medium (5–9)
          </span>
          <span class="risk-matrix__legend-item risk-matrix__legend-item--high">
            High (10–16)
          </span>
          <span class="risk-matrix__legend-item risk-matrix__legend-item--critical">
            Critical (17–25)
          </span>
        </div>
      </div>
    );
  },
};
