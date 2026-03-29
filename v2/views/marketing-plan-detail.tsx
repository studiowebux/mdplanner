import type { FC } from "hono/jsx";
import { MainLayout } from "../components/layout/main.tsx";
import { BackButton } from "./components/back-button.tsx";
import type { MarketingPlan } from "../types/marketing-plan.types.ts";
import type { Goal } from "../types/goal.types.ts";
import type { ViewProps } from "../types/app.ts";
import { formatDate } from "../utils/time.ts";
import { toKebab } from "../utils/slug.ts";
import { MarkdownSection } from "./components/markdown-section.tsx";
import { DetailActions } from "./components/detail-actions.tsx";
import { SseRefresh } from "./components/sse-refresh.tsx";
import { InfoItem } from "./components/info-item.tsx";
import {
  MKTPLAN_ITEM_STATUS_VARIANTS,
  MKTPLAN_STATUS_VARIANTS,
  MKTPLAN_VERDICT_VARIANTS,
} from "../domains/marketing-plan/constants.tsx";
import { GOAL_STATUS_VARIANTS } from "../domains/goal/constants.tsx";

// ---------------------------------------------------------------------------
// Main view
// ---------------------------------------------------------------------------

export const MarketingPlanDetailView: FC<
  ViewProps & { item: MarketingPlan; goals?: Goal[] }
> = (
  { item: plan, goals = [], ...viewProps },
) => {
  const budget = plan.budgetTotal != null
    ? `${plan.budgetCurrency ?? ""} ${plan.budgetTotal.toLocaleString()}`
      .trim()
    : "";

  const hasOverview = budget || plan.project || plan.responsible ||
    plan.description;
  const hasTimeline = plan.startDate || plan.endDate;
  const hasTeam = (plan.team?.length ?? 0) > 0;
  const hasHypothesis = (plan.hypothesis?.length ?? 0) > 0;
  const hasLearnings = (plan.learnings?.length ?? 0) > 0;
  const hasAudiences = (plan.targetAudiences?.length ?? 0) > 0;
  const hasChannels = (plan.channels?.length ?? 0) > 0;
  const hasCampaigns = (plan.campaigns?.length ?? 0) > 0;
  const hasGoals = goals.length > 0;

  return (
    <MainLayout
      title={plan.name}
      {...viewProps}
      styles={["/css/views/marketing-plans.css", "/css/views/goals.css"]}
      scripts={["/js/kpi-gauge.js"]}
    >
      <SseRefresh
        getUrl={"/marketing-plans/" + plan.id}
        trigger="sse:marketing-plan.updated"
        targetId="mktplan-detail-root"
      />
      <main id="mktplan-detail-root" class="detail-view mktplan-detail">
        <BackButton href="/marketing-plans" label="Back to Marketing Plans" />

        {/* -- Header ---------------------------------------------------- */}
        <header class="detail-section mktplan-detail__header">
          <div class="detail-title-row mktplan-detail__title-row">
            <h1 class="detail-title mktplan-detail__title">{plan.name}</h1>
            <span
              class={`badge badge--${
                MKTPLAN_STATUS_VARIANTS[plan.status] ?? "neutral"
              }`}
            >
              {plan.status}
            </span>
          </div>
          <DetailActions
            entity="marketing-plans"
            id={plan.id}
            title={plan.name}
            formContainerId="marketing-plans-form-container"
          />
        </header>

        {/* -- Overview -------------------------------------------------- */}
        {(hasOverview || hasTimeline) && (
          <div class="detail-section detail-info-row">
            {budget && <InfoItem label="Budget">{budget}</InfoItem>}
            {plan.project && (
              <InfoItem label="Project">
                <a href={`/portfolio/${toKebab(plan.project)}`}>
                  {plan.project}
                </a>
              </InfoItem>
            )}
            {plan.responsible && (
              <InfoItem label="Responsible">
                <a href={`/people/${plan.responsible}`}>
                  {plan.responsible}
                </a>
              </InfoItem>
            )}
            {plan.startDate && (
              <InfoItem label="Start">{formatDate(plan.startDate)}</InfoItem>
            )}
            {plan.endDate && (
              <InfoItem label="End">{formatDate(plan.endDate)}</InfoItem>
            )}
          </div>
        )}

        {/* -- Team ------------------------------------------------------ */}
        {hasTeam && (
          <section class="detail-section mktplan-detail__section">
            <h2 class="section-heading">
              Team ({(plan.team ?? []).length})
            </h2>
            <span class="mktplan-detail__team">
              {(plan.team ?? []).map((id) => (
                <a key={id} href={`/people/${id}`} class="badge">
                  {id}
                </a>
              ))}
            </span>
          </section>
        )}

        {/* -- Description ----------------------------------------------- */}
        {plan.description && (
          <section class="detail-section mktplan-detail__section">
            <h2 class="section-heading">Description</h2>
            <p class="mktplan-detail__description">{plan.description}</p>
          </section>
        )}

        {/* -- Target Audiences ------------------------------------------ */}
        {hasAudiences && (
          <section class="detail-section mktplan-detail__section">
            <h2 class="section-heading">
              Target Audiences ({(plan.targetAudiences ?? []).length})
            </h2>
            <table class="data-table data-table--compact data-table--uppercase">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Description</th>
                  <th>Size</th>
                </tr>
              </thead>
              <tbody>
                {(plan.targetAudiences ?? []).map((a, idx) => (
                  <tr key={idx}>
                    <td>{a.name}</td>
                    <td>{a.description ?? ""}</td>
                    <td>{a.size ?? ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {/* -- Channels -------------------------------------------------- */}
        {hasChannels && (
          <section class="detail-section mktplan-detail__section">
            <h2 class="section-heading">
              Channels ({(plan.channels ?? []).length})
            </h2>
            <table class="data-table data-table--compact data-table--uppercase">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Budget</th>
                  <th>Status</th>
                  <th>Goals</th>
                </tr>
              </thead>
              <tbody>
                {(plan.channels ?? []).map((ch, idx) => (
                  <tr key={idx}>
                    <td>{ch.name}</td>
                    <td>
                      {ch.budget != null ? ch.budget.toLocaleString() : ""}
                    </td>
                    <td>
                      {ch.status
                        ? (
                          <span
                            class={`badge badge--${
                              MKTPLAN_ITEM_STATUS_VARIANTS[ch.status] ??
                                "neutral"
                            }`}
                          >
                            {ch.status}
                          </span>
                        )
                        : ""}
                    </td>
                    <td>{ch.goals ?? ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {/* -- Campaigns ------------------------------------------------- */}
        {hasCampaigns && (
          <section class="detail-section mktplan-detail__section">
            <h2 class="section-heading">
              Campaigns ({(plan.campaigns ?? []).length})
            </h2>
            <table class="data-table data-table--compact data-table--uppercase">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Channel</th>
                  <th>Budget</th>
                  <th>Start</th>
                  <th>End</th>
                  <th>Status</th>
                  <th>Goals</th>
                </tr>
              </thead>
              <tbody>
                {(plan.campaigns ?? []).map((c, idx) => (
                  <tr key={idx}>
                    <td>{c.name}</td>
                    <td>{c.channel ?? ""}</td>
                    <td>
                      {c.budget != null ? c.budget.toLocaleString() : ""}
                    </td>
                    <td>{c.startDate ? formatDate(c.startDate) : ""}</td>
                    <td>{c.endDate ? formatDate(c.endDate) : ""}</td>
                    <td>
                      {c.status
                        ? (
                          <span
                            class={`badge badge--${
                              MKTPLAN_ITEM_STATUS_VARIANTS[c.status] ??
                                "neutral"
                            }`}
                          >
                            {c.status}
                          </span>
                        )
                        : ""}
                    </td>
                    <td>{c.goals ?? ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {/* -- Linked Goals ---------------------------------------------- */}
        {hasGoals && (
          <section class="detail-section mktplan-detail__section">
            <h2 class="section-heading">
              Linked Goals ({goals.length})
            </h2>
            <div class="mktplan-detail__kpis">
              {goals.map((goal) => {
                const pct = goal.kpiTarget && goal.kpiTarget > 0
                  ? Math.min(
                    Math.round(
                      ((goal.kpiValue ?? 0) / goal.kpiTarget) * 100,
                    ),
                    100,
                  )
                  : goal.progress ?? 0;
                return (
                  <div key={goal.id} class="mktplan-kpi">
                    <div class="mktplan-kpi__header">
                      <a href={`/goals/${goal.id}`} class="mktplan-kpi__metric">
                        {goal.title}
                      </a>
                      <span
                        class={`badge badge--${
                          GOAL_STATUS_VARIANTS[goal.status] ?? "neutral"
                        }`}
                      >
                        {goal.status}
                      </span>
                    </div>
                    {goal.kpi && (
                      <span class="mktplan-kpi__label">{goal.kpi}</span>
                    )}
                    {goal.kpiTarget != null && (
                      <>
                        <div class="mktplan-kpi__values">
                          {(goal.kpiValue ?? 0).toLocaleString()} /{" "}
                          {goal.kpiTarget.toLocaleString()}
                        </div>
                        <div class="mktplan-kpi__bar">
                          <div class="mktplan-kpi__fill" data-pct={pct} />
                        </div>
                        <span class="mktplan-kpi__pct">{pct}%</span>
                      </>
                    )}
                    {goal.kpiTarget == null && goal.progress != null && (
                      <>
                        <div class="mktplan-kpi__bar">
                          <div
                            class="mktplan-kpi__fill"
                            data-pct={goal.progress}
                          />
                        </div>
                        <span class="mktplan-kpi__pct">{goal.progress}%</span>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* -- Hypothesis ------------------------------------------------ */}
        {hasHypothesis && (
          <section class="detail-section mktplan-detail__section">
            <h2 class="section-heading">
              Hypothesis ({(plan.hypothesis ?? []).length})
            </h2>
            <ul class="mktplan-detail__hypothesis-list">
              {(plan.hypothesis ?? []).map((h, idx) => (
                <li key={idx} class="mktplan-detail__hypothesis-item">
                  <span class="mktplan-detail__hypothesis-text">{h.text}</span>
                  {h.verdict && (
                    <span
                      class={`badge badge--${
                        MKTPLAN_VERDICT_VARIANTS[h.verdict] ?? "neutral"
                      }`}
                    >
                      {h.verdict}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* -- Learnings ------------------------------------------------- */}
        {hasLearnings && (
          <section class="detail-section mktplan-detail__section">
            <h2 class="section-heading">
              Learnings ({(plan.learnings ?? []).length})
            </h2>
            <ul class="mktplan-detail__hypothesis-list">
              {(plan.learnings ?? []).map((l, idx) => (
                <li key={idx}>{l.text}</li>
              ))}
            </ul>
          </section>
        )}

        {/* -- Notes ----------------------------------------------------- */}
        <MarkdownSection title="Notes" markdown={plan.notes} />

        {/* -- Meta ------------------------------------------------------ */}
        <div class="detail-section mktplan-detail__meta">
          <span>Created {formatDate(plan.createdAt)}</span>
          {plan.updatedAt && plan.updatedAt !== plan.createdAt && (
            <span>&middot; Updated {formatDate(plan.updatedAt)}</span>
          )}
        </div>
      </main>

      <div id="marketing-plans-form-container" />
    </MainLayout>
  );
};
