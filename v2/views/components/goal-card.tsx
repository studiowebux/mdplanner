import type { FC } from "hono/jsx";
import type { Goal } from "../../types/goal.types.ts";
import { DomainCard } from "../../components/ui/domain-card.tsx";
import { highlightHtml } from "../../utils/highlight.tsx";
import { dueIn, formatDate } from "../../utils/time.ts";
import { markdownToHtml } from "../../utils/markdown.ts";

type Props = { item: Goal; q?: string };

export const GoalCard: FC<Props> = ({ item, q }) => {
  const descHtml = markdownToHtml(item.description);
  const isCompleted = item.status === "success" || item.status === "failed";
  const deadline = isCompleted ? "" : dueIn(item.endDate);
  const isOverdue = deadline.includes("overdue");
  const tookDays = isCompleted && item.startDate
    ? Math.max(
      0,
      Math.round(
        (new Date(item.updated).getTime() -
          new Date(item.startDate).getTime()) / 86400000,
      ),
    )
    : null;
  const now = Date.now();
  const start = item.startDate ? new Date(item.startDate).getTime() : 0;
  const end = item.endDate ? new Date(item.endDate).getTime() : 0;
  const progress = start && end && end > start
    ? Math.min(
      100,
      Math.max(0, Math.round(((now - start) / (end - start)) * 100)),
    )
    : 0;

  return (
    <DomainCard
      href={`/goals/${item.id}`}
      name={item.title}
      q={q}
      domain="goals"
      id={item.id}
      className={item.status === "success" || item.status === "failed"
        ? "goal-card--completed"
        : undefined}
      badge={
        <span class={`badge goal-status goal-status--${item.status}`}>
          {item.status}
        </span>
      }
    >
      <dl class="domain-card__meta">
        <dt class="domain-card__meta-label">Type</dt>
        <dd class="domain-card__meta-value">
          <span class={`badge goal-badge goal-badge--${item.type}`}>
            {item.type}
          </span>
          {item.type === "project" && item.project && (
            <span>{item.project}</span>
          )}
        </dd>
        {item.kpi && (
          <>
            <dt class="domain-card__meta-label">KPI</dt>
            <dd class="domain-card__meta-value">{item.kpi}</dd>
          </>
        )}
        {item.project && (
          <>
            <dt class="domain-card__meta-label">Project</dt>
            <dd class="domain-card__meta-value">
              <a href={`/portfolio?q=${encodeURIComponent(item.project)}`}>
                {item.project}
              </a>
            </dd>
          </>
        )}
        {item.startDate && (
          <>
            <dt class="domain-card__meta-label">Start</dt>
            <dd class="domain-card__meta-value">
              {formatDate(item.startDate)}
            </dd>
          </>
        )}
        {item.endDate && (
          <>
            <dt class="domain-card__meta-label">End</dt>
            <dd class="domain-card__meta-value">
              {formatDate(item.endDate)}
            </dd>
          </>
        )}
        {item.linkedPortfolioItems && item.linkedPortfolioItems.length > 0 && (
          <>
            <dt class="domain-card__meta-label">Linked</dt>
            <dd class="domain-card__meta-value">
              {item.linkedPortfolioItems.length} portfolio item(s)
            </dd>
          </>
        )}
      </dl>

      {start > 0 && end > 0 && (
        <div class="goal-card__progress">
          <progress class="goal-card__bar" value={progress} max={100} />
          <span class="goal-card__stats">
            {progress}% elapsed
            {deadline && (
              <span
                class={`goal-deadline${
                  isOverdue ? " goal-deadline--overdue" : ""
                }`}
              >
                {" — "}
                {deadline}
              </span>
            )}
            {tookDays !== null && (
              <span class="goal-deadline">
                {" — "}took {tookDays} day{tookDays !== 1 ? "s" : ""}
              </span>
            )}
          </span>
        </div>
      )}

      {descHtml && (
        <div
          class="goal-card__description markdown-body"
          dangerouslySetInnerHTML={{ __html: highlightHtml(descHtml, q) }}
        />
      )}
    </DomainCard>
  );
};
