import type { FC } from "hono/jsx";
import type { Milestone } from "../../types/milestone.types.ts";
import { DomainCard } from "../../components/ui/domain-card.tsx";
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
    <DomainCard
      href={`/milestones/${milestone.id}`}
      name={milestone.name}
      q={q}
      domain="milestones"
      id={milestone.id}
      className={milestone.status === "completed"
        ? "milestone-card--completed"
        : undefined}
      badge={
        <span
          class={`milestone-card__badge milestone-card__badge--${milestone.status}`}
        >
          {milestone.status}
        </span>
      }
    >
      <dl class="domain-card__meta">
        {milestone.project && (
          <>
            <dt class="domain-card__meta-label">Project</dt>
            <dd class="domain-card__meta-value">
              <Highlight text={milestone.project!} q={q} />
            </dd>
          </>
        )}
        {milestone.target && (
          <>
            <dt class="domain-card__meta-label">Target</dt>
            <dd class="domain-card__meta-value">
              {formatDate(milestone.target)}
            </dd>
          </>
        )}
        {milestone.status !== "completed" && milestone.createdAt && (
          <>
            <dt class="domain-card__meta-label">Created</dt>
            <dd class="domain-card__meta-value">
              {timeAgo(milestone.createdAt)}
            </dd>
          </>
        )}
        {milestone.status !== "completed" && milestone.target && (
          <>
            <dt class="domain-card__meta-label">Due</dt>
            <dd
              class={`domain-card__meta-value${
                dueIn(milestone.target).includes("overdue") ? " text-error" : ""
              }`}
            >
              {dueIn(milestone.target)}
            </dd>
          </>
        )}
        {milestone.status === "completed" && milestone.completedAt && (
          <>
            <dt class="domain-card__meta-label">Completed</dt>
            <dd class="domain-card__meta-value">
              {formatDate(milestone.completedAt)}
              {duration(milestone.createdAt, milestone.completedAt) &&
                ` (${duration(milestone.createdAt, milestone.completedAt)})`}
            </dd>
          </>
        )}
        {v && (
          <>
            <dt class="domain-card__meta-label">Variance</dt>
            <dd class={`domain-card__meta-value ${vClass}`}>{v}</dd>
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
    </DomainCard>
  );
};
