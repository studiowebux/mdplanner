import type { FC } from "hono/jsx";
import type { Milestone } from "../../types/milestone.types.ts";

type Props = { milestone: Milestone };

export const MilestoneCard: FC<Props> = ({ milestone }) => (
  <article
    class={`milestone-card${milestone.status === "completed" ? " milestone-card--completed" : ""}`}
    id={`milestone-${milestone.id}`}
  >
    <header class="milestone-card__header">
      <h2 class="milestone-card__name">{milestone.name}</h2>
      <span class={`milestone-card__badge milestone-card__badge--${milestone.status}`}>
        {milestone.status}
      </span>
    </header>

    {milestone.target && (
      <p class="milestone-card__target">Target: {milestone.target}</p>
    )}

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
        class="milestone-card__description"
        dangerouslySetInnerHTML={{ __html: milestone.descriptionHtml }}
      />
    )}

    <div class="milestone-card__actions">
      <button
        class="btn btn--secondary btn--sm"
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
        class="btn btn--danger btn--sm"
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
