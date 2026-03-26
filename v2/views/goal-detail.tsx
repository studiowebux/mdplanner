import type { FC } from "hono/jsx";
import { MainLayout } from "../components/layout/main.tsx";
import type { Goal } from "../types/goal.types.ts";
import type { PortfolioItem } from "../types/portfolio.types.ts";
import type { ViewProps } from "../types/app.ts";
import { dueIn, formatDate } from "../utils/time.ts";
import { markdownToHtml } from "../utils/markdown.ts";

export const GoalDetailView: FC<
  ViewProps & { item: Goal; portfolioItems?: PortfolioItem[] }
> = (
  { item: goal, portfolioItems = [], ...viewProps },
) => {
  const portfolioByName = portfolioItems.find((p) => p.name === goal.project);
  const portfolioIdByName = portfolioByName?.id;
  const descHtml = markdownToHtml(goal.description);
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

  return (
    <MainLayout
      title={goal.title}
      {...viewProps}
      styles={["/css/views/goals.css"]}
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

        <div class="detail-section goal-detail__info-grid">
          {goal.kpi && (
            <div class="goal-detail__info-item">
              <span class="goal-detail__info-label">KPI</span>
              <span class="goal-detail__info-value">{goal.kpi}</span>
            </div>
          )}
          {goal.kpiMetric && (
            <div class="goal-detail__info-item">
              <span class="goal-detail__info-label">KPI Metric</span>
              <span class="goal-detail__info-value">{goal.kpiMetric}</span>
            </div>
          )}
          {goal.kpiTarget !== undefined && (
            <div class="goal-detail__info-item">
              <span class="goal-detail__info-label">KPI Target</span>
              <span class="goal-detail__info-value">{goal.kpiTarget}</span>
            </div>
          )}
          {goal.startDate && (
            <div class="goal-detail__info-item">
              <span class="goal-detail__info-label">Start</span>
              <span class="goal-detail__info-value">
                {formatDate(goal.startDate)}
              </span>
            </div>
          )}
          {goal.endDate && (
            <div class="goal-detail__info-item">
              <span class="goal-detail__info-label">End</span>
              <span class="goal-detail__info-value">
                {formatDate(goal.endDate)}
              </span>
            </div>
          )}
          {goal.project && (
            <div class="goal-detail__info-item">
              <span class="goal-detail__info-label">Project</span>
              <span class="goal-detail__info-value">
                <a
                  href={portfolioIdByName
                    ? `/portfolio/${portfolioIdByName}`
                    : `/portfolio?q=${encodeURIComponent(goal.project)}`}
                >
                  {goal.project}
                </a>
              </span>
            </div>
          )}
        </div>

        {descHtml && (
          <section class="detail-section goal-detail__section">
            <h2 class="section-heading">Description</h2>
            <div
              class="markdown-body"
              dangerouslySetInnerHTML={{ __html: descHtml }}
            />
          </section>
        )}
      </main>

      <div id="goals-form-container" />
    </MainLayout>
  );
};
