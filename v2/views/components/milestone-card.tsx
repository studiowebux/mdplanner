import type { FC } from "hono/jsx";
import type { Milestone } from "../../types/milestone.types.ts";
import {
  dueIn,
  duration,
  formatDate,
  timeAgo,
  variance,
  varianceClass,
} from "../../utils/time.ts";
import { Highlight, highlightHtml } from "../../utils/highlight.tsx";

type Props = { milestone: Milestone; q?: string };

export const MilestoneCard: FC<Props> = ({ milestone, q }) => {
  const v = variance(milestone.target, milestone.completedAt);
  const vClass = varianceClass(milestone.target, milestone.completedAt);

  return (
    <article
      class={`milestone-card${
        milestone.status === "completed" ? " milestone-card--completed" : ""
      }`}
      id={`milestone-${milestone.id}`}
      data-filterable-card
    >
      <header class="milestone-card__header">
        <h2 class="milestone-card__name">
          <a href={`/milestones/${milestone.id}`}>
            <Highlight text={milestone.name} q={q} />
          </a>
        </h2>
        <span
          class={`milestone-card__badge milestone-card__badge--${milestone.status}`}
        >
          {milestone.status}
        </span>
      </header>

      <dl class="milestone-card__meta">
        {milestone.project && (
          <>
            <dt class="milestone-card__meta-label">Project</dt>
            <dd class="milestone-card__meta-value">
              <Highlight text={milestone.project!} q={q} />
            </dd>
          </>
        )}
        {milestone.target && (
          <>
            <dt class="milestone-card__meta-label">Target</dt>
            <dd class="milestone-card__meta-value">
              {formatDate(milestone.target)}
            </dd>
          </>
        )}
        {milestone.status !== "completed" && milestone.createdAt && (
          <>
            <dt class="milestone-card__meta-label">Created</dt>
            <dd class="milestone-card__meta-value">
              {timeAgo(milestone.createdAt)}
            </dd>
          </>
        )}
        {milestone.status !== "completed" && milestone.target && (
          <>
            <dt class="milestone-card__meta-label">Due</dt>
            <dd
              class={`milestone-card__meta-value${
                dueIn(milestone.target).includes("overdue") ? " text-error" : ""
              }`}
            >
              {dueIn(milestone.target)}
            </dd>
          </>
        )}
        {milestone.status === "completed" && milestone.completedAt && (
          <>
            <dt class="milestone-card__meta-label">Completed</dt>
            <dd class="milestone-card__meta-value">
              {formatDate(milestone.completedAt)}
              {duration(milestone.createdAt, milestone.completedAt) &&
                ` (${duration(milestone.createdAt, milestone.completedAt)})`}
            </dd>
          </>
        )}
        {v && (
          <>
            <dt class="milestone-card__meta-label">Variance</dt>
            <dd class={`milestone-card__meta-value ${vClass}`}>{v}</dd>
          </>
        )}
      </dl>

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
          dangerouslySetInnerHTML={{
            __html: highlightHtml(milestone.descriptionHtml!, q),
          }}
        />
      )}

      <div class="milestone-card__actions">
        <button
          class="btn btn--secondary"
          type="button"
          hx-get={`/milestones/${milestone.id}/edit`}
          hx-target="#milestone-form-container"
          hx-swap="innerHTML"
        >
          Edit
        </button>
        <button
          class="btn btn--danger"
          type="button"
          hx-delete={`/milestones/${milestone.id}`}
          hx-swap="none"
          hx-confirm-dialog={`Delete "${milestone.name}"? This cannot be undone.`}
          data-confirm-name={milestone.name}
        >
          Delete
        </button>
      </div>
    </article>
  );
};
