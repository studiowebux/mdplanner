import type { FC } from "hono/jsx";
import type { Milestone } from "../../types/milestone.types.ts";
import { timeAgo, duration, variance, dueIn, formatDate } from "../../utils/time.ts";

type Props = { milestone: Milestone };

export const MilestoneCard: FC<Props> = ({ milestone }) => {
  const v = variance(milestone.target, milestone.completedAt);
  const vClass = v.includes("late") ? "text-error" : v ? "text-success" : "";

  return (
    <article
      class={`milestone-card${milestone.status === "completed" ? " milestone-card--completed" : ""}`}
      id={`milestone-${milestone.id}`}
      data-filterable-card
      data-filter-status={milestone.status}
      data-filter-project={milestone.project ?? ""}
    >
      <header class="milestone-card__header">
        <h2 class="milestone-card__name">
          <a href={`/milestones/${milestone.id}`}>{milestone.name}</a>
        </h2>
        <span class={`milestone-card__badge milestone-card__badge--${milestone.status}`}>
          {milestone.status}
        </span>
      </header>

      <div class="milestone-card__meta">
        {milestone.project && (
          <span class="milestone-card__meta-item">Project: {milestone.project}</span>
        )}
        {milestone.target && (
          <span class="milestone-card__meta-item">Target: {formatDate(milestone.target)}</span>
        )}
        {milestone.status !== "completed" && milestone.createdAt && (
          <span class="milestone-card__meta-item">Created: {timeAgo(milestone.createdAt)}</span>
        )}
        {milestone.status !== "completed" && milestone.target && (
          <span class={`milestone-card__meta-item${dueIn(milestone.target).includes("overdue") ? " text-error" : ""}`}>
            {dueIn(milestone.target)}
          </span>
        )}
        {milestone.status === "completed" && milestone.completedAt && (
          <span class="milestone-card__meta-item">
            Completed: {formatDate(milestone.completedAt)}
            {duration(milestone.createdAt, milestone.completedAt) &&
              ` (${duration(milestone.createdAt, milestone.completedAt)})`}
          </span>
        )}
        {v && (
          <span class={`milestone-card__meta-item ${vClass}`}>{v}</span>
        )}
      </div>

      <div class="milestone-card__progress">
        <progress
          class="milestone-card__bar"
          value={milestone.progress}
          max={100}
        />
        <span class="milestone-card__stats">
          {milestone.completedCount}/{milestone.taskCount} tasks &middot;{" "}
          {milestone.progress}%
        </span>
      </div>

      {milestone.descriptionHtml && (
        <div
          class="milestone-card__description markdown-body"
          dangerouslySetInnerHTML={{ __html: milestone.descriptionHtml }}
        />
      )}

      <div class="milestone-card__actions">
      <button
        class="btn btn--secondary"
        type="button"
        data-sidenav-open="milestone-form"
        data-milestone-action="edit"
        data-milestone-id={milestone.id}
        data-milestone-name={milestone.name}
        data-milestone-status={milestone.status}
        data-milestone-target={milestone.target ?? ""}
        data-milestone-description={milestone.description ?? ""}
        data-milestone-project={milestone.project ?? ""}
      >
        Edit
      </button>
      <button
        class="btn btn--danger"
        type="button"
        data-milestone-action="delete"
        data-milestone-id={milestone.id}
        data-milestone-name={milestone.name}
      >
        Delete
      </button>
    </div>
  </article>
  );
};
