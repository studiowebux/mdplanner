import type { FC } from "hono/jsx";
import { MainLayout } from "../components/layout/main.tsx";
import type { Goal } from "../types/goal.types.ts";
import type { MilestoneBase } from "../types/milestone.types.ts";
import type { PortfolioItem } from "../types/portfolio.types.ts";
import type { ViewProps } from "../types/app.ts";
import { PRIORITY_LABELS } from "../constants/mod.ts";
import { dueIn, formatDate } from "../utils/time.ts";
import { markdownToHtml } from "../utils/markdown.ts";
import { KpiGauge } from "../components/ui/kpi-gauge.tsx";
import { toKebab } from "../utils/slug.ts";

// ---------------------------------------------------------------------------
// Helper — renders a label/value pair inside an info-row
// ---------------------------------------------------------------------------

const InfoItem: FC<{ label: string; children: unknown }> = (
  { label, children },
) => (
  <div class="goal-detail__info-item">
    <span class="goal-detail__info-label">{label}</span>
    <span class="goal-detail__info-value">{children}</span>
  </div>
);

// ---------------------------------------------------------------------------
// Main view
// ---------------------------------------------------------------------------

export const GoalDetailView: FC<
  ViewProps & {
    item: Goal;
    portfolioItems?: PortfolioItem[];
    parentGoal?: Goal | null;
    linkedMilestones?: MilestoneBase[];
    childGoals?: Goal[];
    personByName?: Record<string, string>;
  }
> = (
  {
    item: goal,
    portfolioItems = [],
    parentGoal,
    linkedMilestones = [],
    childGoals = [],
    personByName = {},
    ...viewProps
  },
) => {
  const portfolioByName = portfolioItems.find((p) => p.name === goal.project);
  const portfolioIdByName = portfolioByName?.id;
  const descHtml = markdownToHtml(goal.description);
  const notesHtml = goal.notes ? markdownToHtml(goal.notes) : "";
  const isCompleted = goal.status === "success" || goal.status === "failed";
  const deadline = isCompleted ? "" : dueIn(goal.endDate);
  const isOverdue = deadline.includes("overdue");
  const tookDays = isCompleted && goal.startDate
    ? Math.max(
      0,
      Math.round(
        (new Date(goal.updated).getTime() -
          new Date(goal.startDate).getTime()) / 86400000,
      ),
    )
    : null;

  const projectSlug = goal.project ? toKebab(goal.project) : "";

  const hasOverview = goal.owner || goal.priority || goal.project || parentGoal;
  const hasKpi = goal.kpi || goal.kpiMetric ||
    goal.kpiValue !== undefined || goal.kpiTarget !== undefined ||
    goal.progress !== undefined;
  const hasTimeline = goal.startDate || goal.endDate;
  const hasRelationships = (goal.contributors?.length ?? 0) > 0 ||
    linkedMilestones.length > 0 || (goal.tags?.length ?? 0) > 0;

  return (
    <MainLayout
      title={goal.title}
      {...viewProps}
      styles={["/css/views/goals.css"]}
      scripts={["/js/kpi-gauge.js"]}
    >
      <div
        hx-ext="sse"
        sse-connect="/sse"
        hx-get={`/goals/${goal.id}`}
        hx-trigger="sse:goal.updated"
        hx-target="#goal-detail-root"
        hx-select="#goal-detail-root"
        hx-swap="outerHTML"
      />
      <main id="goal-detail-root" class="detail-view goal-detail">
        <div class="goal-detail__back">
          <a href="/goals" class="btn btn--secondary">Back to Goals</a>
        </div>

        {/* ── Header ─────────────────────────────────────────────── */}
        <header class="detail-section goal-detail__header">
          <div class="detail-title-row goal-detail__title-row">
            <h1 class="detail-title goal-detail__title">{goal.title}</h1>
            <span class={`badge goal-status goal-status--${goal.status}`}>
              {goal.status}
            </span>
            <span class={`badge goal-badge goal-badge--${goal.type}`}>
              {goal.type}
            </span>
            {deadline && (
              <span
                class={`goal-deadline${
                  isOverdue ? " goal-deadline--overdue" : ""
                }`}
              >
                {deadline}
              </span>
            )}
            {tookDays !== null && (
              <span class="goal-deadline">
                took {tookDays} day{tookDays !== 1 ? "s" : ""}
              </span>
            )}
          </div>
          <div class="detail-actions">
            <button
              class="btn btn--secondary btn--sm"
              type="button"
              hx-get={`/goals/${goal.id}/edit`}
              hx-target="#goals-form-container"
              hx-swap="innerHTML"
            >
              Edit
            </button>
            <button
              class="btn btn--danger btn--sm"
              type="button"
              hx-delete={`/goals/${goal.id}`}
              hx-swap="none"
              hx-confirm-dialog={`Delete "${goal.title}"? This cannot be undone.`}
              data-confirm-name={goal.title}
            >
              Delete
            </button>
          </div>
        </header>

        {/* ── Overview row ───────────────────────────────────────── */}
        {hasOverview && (
          <div class="detail-section goal-detail__info-row">
            {goal.priority && (
              <InfoItem label="Priority">
                <span class={`badge priority--${goal.priority}`}>
                  {PRIORITY_LABELS[String(goal.priority)] ??
                    `P${goal.priority}`}
                </span>
              </InfoItem>
            )}
            {goal.owner && (
              <InfoItem label="Owner">
                {personByName[goal.owner]
                  ? (
                    <a href={`/people/${personByName[goal.owner]}`}>
                      {goal.owner}
                    </a>
                  )
                  : goal.owner}
              </InfoItem>
            )}
            {goal.project && (
              <InfoItem label="Project">
                <a href={`/portfolio/${portfolioIdByName ?? projectSlug}`}>
                  {goal.project}
                </a>
              </InfoItem>
            )}
            {parentGoal && (
              <InfoItem label="Parent Goal">
                <a href={`/goals/${parentGoal.id}`}>{parentGoal.title}</a>
              </InfoItem>
            )}
          </div>
        )}

        {/* ── Measurement row ────────────────────────────────────── */}
        {hasKpi && (
          <div class="detail-section goal-detail__info-row">
            {goal.kpi && <InfoItem label="KPI">{goal.kpi}</InfoItem>}
            {goal.kpiMetric && (
              <InfoItem label="Metric">{goal.kpiMetric}</InfoItem>
            )}
            {goal.kpiValue !== undefined && goal.kpiTarget !== undefined
              ? (
                <InfoItem label="KPI Progress">
                  <KpiGauge value={goal.kpiValue} target={goal.kpiTarget} />
                </InfoItem>
              )
              : (
                <>
                  {goal.kpiTarget !== undefined && (
                    <InfoItem label="Target">{goal.kpiTarget}</InfoItem>
                  )}
                  {goal.kpiValue !== undefined && (
                    <InfoItem label="Value">{goal.kpiValue}</InfoItem>
                  )}
                </>
              )}
            {goal.progress !== undefined && (
              <InfoItem label="Progress">
                <div class="goal-progress-cell">
                  <progress
                    class="progress-bar"
                    value={goal.progress}
                    max={100}
                  />
                  <span>{goal.progress}%</span>
                </div>
              </InfoItem>
            )}
          </div>
        )}

        {/* ── Timeline row ───────────────────────────────────────── */}
        {hasTimeline && (
          <div class="detail-section goal-detail__info-row">
            {goal.startDate && (
              <InfoItem label="Start">{formatDate(goal.startDate)}</InfoItem>
            )}
            {goal.endDate && (
              <InfoItem label="End">{formatDate(goal.endDate)}</InfoItem>
            )}
          </div>
        )}

        {/* ── Relationships row ──────────────────────────────────── */}
        {hasRelationships && (
          <div class="detail-section goal-detail__info-row">
            {(goal.contributors?.length ?? 0) > 0 && (
              <InfoItem label="Contributors">
                <span class="goal-detail__links">
                  {goal.contributors!.map((c) => (
                    personByName[c]
                      ? (
                        <a href={`/people/${personByName[c]}`} class="badge">
                          {c}
                        </a>
                      )
                      : <span class="badge">{c}</span>
                  ))}
                </span>
              </InfoItem>
            )}
            {linkedMilestones.length > 0 && (
              <InfoItem label="Milestones">
                <span class="goal-detail__links">
                  {linkedMilestones.map((m) => (
                    <a href={`/milestones/${m.id}`} class="badge">
                      {m.name}
                    </a>
                  ))}
                </span>
              </InfoItem>
            )}
            {(goal.tags?.length ?? 0) > 0 && (
              <InfoItem label="Tags">
                <span class="goal-detail__links">
                  {goal.tags!.map((t) => (
                    <span key={t} class="badge">{t}</span>
                  ))}
                </span>
              </InfoItem>
            )}
          </div>
        )}

        {/* ── Description ────────────────────────────────────────── */}
        {descHtml && (
          <section class="detail-section goal-detail__section">
            <h2 class="section-heading">Description</h2>
            <div
              class="markdown-body"
              dangerouslySetInnerHTML={{ __html: descHtml }}
            />
          </section>
        )}

        {/* ── Notes ──────────────────────────────────────────────── */}
        {notesHtml && (
          <section class="detail-section goal-detail__section">
            <h2 class="section-heading">Notes</h2>
            <div
              class="markdown-body"
              dangerouslySetInnerHTML={{ __html: notesHtml }}
            />
          </section>
        )}

        {/* ── Sub-Goals ──────────────────────────────────────────── */}
        {childGoals.length > 0 && (
          <section class="detail-section goal-detail__section">
            <h2 class="section-heading">
              Sub-Goals ({childGoals.length})
            </h2>
            <table class="data-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Status</th>
                  <th>Progress</th>
                </tr>
              </thead>
              <tbody>
                {childGoals.map((child) => (
                  <tr>
                    <td class="data-table__td">
                      <a href={`/goals/${child.id}`}>{child.title}</a>
                    </td>
                    <td class="data-table__td">
                      <span
                        class={`badge goal-status goal-status--${child.status}`}
                      >
                        {child.status}
                      </span>
                    </td>
                    <td class="data-table__td">
                      {child.progress !== undefined
                        ? (
                          <div class="goal-progress-cell">
                            <progress
                              class="progress-bar"
                              value={child.progress}
                              max={100}
                            />
                            <span>{child.progress}%</span>
                          </div>
                        )
                        : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}
      </main>

      <div id="goals-form-container" />
    </MainLayout>
  );
};
