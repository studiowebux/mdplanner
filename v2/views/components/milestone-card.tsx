import type { FC } from "hono/jsx";
import type { Milestone } from "../../types/milestone.types.ts";
import { DomainCard } from "../../components/ui/domain-card.tsx";
import { CardMeta, CardMetaItem } from "./card-meta.tsx";
import {
  dueIn,
  duration,
  formatDate,
  timeAgo,
  variance,
  varianceClass,
} from "../../utils/time.ts";
import { Highlight, highlightHtml } from "../../utils/highlight.tsx";
import { MILESTONE_STATUS_VARIANTS } from "../../domains/milestone/constants.tsx";
import { toKebab } from "../../utils/slug.ts";

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
          class={`badge badge--${
            MILESTONE_STATUS_VARIANTS[milestone.status] ?? "neutral"
          }`}
        >
          {milestone.status}
        </span>
      }
    >
      <CardMeta>
        {milestone.project && (
          <CardMetaItem label="Project">
            <a href={`/portfolio/${toKebab(milestone.project)}`}>
              <Highlight text={milestone.project} q={q} />
            </a>
          </CardMetaItem>
        )}
        {milestone.target && (
          <CardMetaItem label="Target">
            {formatDate(milestone.target)}
          </CardMetaItem>
        )}
        {milestone.status !== "completed" && milestone.createdAt && (
          <CardMetaItem label="Created">
            {timeAgo(milestone.createdAt)}
          </CardMetaItem>
        )}
        {milestone.status !== "completed" && milestone.target && (
          <CardMetaItem label="Due">
            <span
              class={dueIn(milestone.target).includes("overdue")
                ? "text-error"
                : undefined}
            >
              {dueIn(milestone.target)}
            </span>
          </CardMetaItem>
        )}
        {milestone.status === "completed" && milestone.completedAt && (
          <CardMetaItem label="Completed">
            {formatDate(milestone.completedAt)}
            {duration(milestone.createdAt, milestone.completedAt) &&
              ` (${duration(milestone.createdAt, milestone.completedAt)})`}
          </CardMetaItem>
        )}
        {v && (
          <CardMetaItem label="Variance">
            <span class={vClass}>{v}</span>
          </CardMetaItem>
        )}
      </CardMeta>

      <div class="progress-group">
        <progress
          class="progress-bar"
          value={milestone.progress}
          max={100}
        />
        <span class="progress-label">
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
