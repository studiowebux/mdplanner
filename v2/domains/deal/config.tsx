// Deal domain config — drives the factory for routes, views, and forms.

import type { DomainConfig } from "../../factories/domain.types.ts";
import type { CreateDeal, Deal, UpdateDeal } from "../../types/deal.types.ts";
import { DEAL_STAGE_LABELS, DEAL_STAGES } from "../../types/deal.types.ts";
import { getDealService } from "../../singletons/services.ts";
import { createSearchPredicate } from "../../utils/string.ts";
import {
  DEAL_FORM_FIELDS,
  DEAL_STAGE_OPTIONS,
  DEAL_STAGE_VARIANTS,
  DEAL_TABLE_COLUMNS,
  dealToRow,
} from "./constants.tsx";
import { DealCard } from "../../views/components/deal-card.tsx";
import { parseFormBody } from "../../utils/form-parser.ts";
import { badgeClass } from "../../components/ui/status-badge.tsx";

export const dealConfig: DomainConfig<Deal, CreateDeal, UpdateDeal> = {
  name: "deals",
  singular: "Deal",
  path: "/deals",
  ssePrefix: "deal",
  styles: ["/css/views/deals.css"],
  emptyMessage: "No deals yet. Create one to get started.",
  defaultView: "pipeline",

  stateKeys: ["view", "stage", "assignee", "company", "q", "sort", "order"],
  columns: DEAL_TABLE_COLUMNS,
  formFields: DEAL_FORM_FIELDS,

  filters: [
    {
      name: "stage",
      label: "All stages",
      options: DEAL_STAGE_OPTIONS,
    },
    {
      name: "assignee",
      label: "All assignees",
      options: [],
    },
  ],

  toRow: dealToRow,

  Card: ({ item, q }) => <DealCard item={item} q={q} />,

  parseCreate: (body) => parseFormBody(DEAL_FORM_FIELDS, body) as CreateDeal,

  parseUpdate: (body) =>
    parseFormBody(DEAL_FORM_FIELDS, body, {
      clearEmpty: true,
    }) as Partial<UpdateDeal>,

  getService: () => getDealService(),

  extractFilterOptions: async () => {
    const deals = await getDealService().list();
    const assignees = [
      ...new Set(deals.map((d) => d.assignee).filter(Boolean) as string[]),
    ].sort();
    return { assignee: assignees };
  },

  searchPredicate: createSearchPredicate<Deal>([
    { type: "string", get: (d) => d.title },
    { type: "string", get: (d) => d.company },
    { type: "string", get: (d) => d.contact },
    { type: "string", get: (d) => d.assignee },
    { type: "string", get: (d) => d.description },
  ]),

  extraViewModes: [{ key: "pipeline", label: "Pipeline" }],

  customViewRenderer: async (_view, _state, items) => {
    const grouped = new Map<string, Deal[]>();
    for (const stage of DEAL_STAGES) grouped.set(stage, []);
    for (const deal of items) {
      grouped.get(deal.stage)?.push(deal);
    }

    return (
      <div class="deal-pipeline">
        {DEAL_STAGES.map((stage, stageIdx) => {
          const stageDeals = grouped.get(stage) ?? [];
          const total = stageDeals.reduce((s, d) => s + (d.value ?? 0), 0);
          const prevStage = stageIdx > 0 ? DEAL_STAGES[stageIdx - 1] : null;
          const nextStage = stageIdx < DEAL_STAGES.length - 1
            ? DEAL_STAGES[stageIdx + 1]
            : null;
          return (
            <div key={stage} class="deal-pipeline__column" data-stage={stage}>
              <div class="deal-pipeline__column-header">
                <div class="deal-pipeline__column-title-row">
                  <h3 class="deal-pipeline__column-title">
                    {DEAL_STAGE_LABELS[stage]}
                  </h3>
                  <div class="deal-pipeline__column-meta">
                    <span class="deal-pipeline__column-count">
                      {stageDeals.length}
                    </span>
                    {total > 0 && (
                      <span class="deal-pipeline__column-total">
                        {total.toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>
                <a
                  href={`/deals/new?stage=${stage}`}
                  class="deal-pipeline__add-btn"
                  title={`Add deal to ${DEAL_STAGE_LABELS[stage]}`}
                >
                  +
                </a>
              </div>
              <div class="deal-pipeline__cards">
                {stageDeals.length === 0
                  ? <div class="deal-pipeline__empty">No deals</div>
                  : stageDeals.map((deal) => {
                    const tags = deal.tags ?? [];
                    return (
                      <div key={deal.id} class="deal-pipeline__card">
                        <a
                          href={`/deals/${deal.id}`}
                          class="deal-pipeline__card-link"
                        >
                          <div class="deal-pipeline__card-title">
                            {deal.title}
                          </div>
                          {deal.value != null && (
                            <div class="deal-pipeline__card-value">
                              {deal.value.toLocaleString()}
                              {deal.currency
                                ? (
                                  <span class="deal-pipeline__card-currency">
                                    {" "}
                                    {deal.currency}
                                  </span>
                                )
                                : ""}
                            </div>
                          )}
                          <div class="deal-pipeline__card-meta">
                            {deal.company && (
                              <span class="deal-pipeline__card-company">
                                {deal.company}
                              </span>
                            )}
                            {deal.contact && (
                              <span class="deal-pipeline__card-contact">
                                {deal.contact}
                              </span>
                            )}
                            {deal.assignee && (
                              <span class="deal-pipeline__card-assignee">
                                {deal.assignee}
                              </span>
                            )}
                          </div>
                          {tags.length > 0 && (
                            <div class="deal-pipeline__card-tags">
                              {tags.map((t) => (
                                <span
                                  key={t}
                                  class="deal-pipeline__card-tag"
                                >
                                  {t}
                                </span>
                              ))}
                            </div>
                          )}
                        </a>
                        <div class="deal-pipeline__card-actions">
                          {prevStage && (
                            <button
                              type="button"
                              class="deal-pipeline__stage-btn"
                              title={`Move to ${DEAL_STAGE_LABELS[prevStage]}`}
                              hx-patch={`/api/v1/deals/${deal.id}/stage`}
                              hx-vals={JSON.stringify({ stage: prevStage })}
                              hx-ext="json-enc"
                              hx-swap="none"
                            >
                              ←
                            </button>
                          )}
                          {nextStage && (
                            <button
                              type="button"
                              class="deal-pipeline__stage-btn"
                              title={`Move to ${DEAL_STAGE_LABELS[nextStage]}`}
                              hx-patch={`/api/v1/deals/${deal.id}/stage`}
                              hx-vals={JSON.stringify({ stage: nextStage })}
                              hx-ext="json-enc"
                              hx-swap="none"
                            >
                              →
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          );
        })}
      </div>
    );
  },
};
