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
import { Highlight } from "../../utils/highlight.tsx";

type Props = { milestone: Milestone; q?: string };

export const MilestoneRow: FC<Props> = ({ milestone: m, q }) => (
  <tr class="data-table__row" data-row-id={m.id}>
    <td class="data-table__td">
      <Highlight text={m.name} q={q} />
    </td>
    <td class="data-table__td">
      <span class={`milestone-card__badge milestone-card__badge--${m.status}`}>
        {m.status}
      </span>
    </td>
    <td class="data-table__td">{formatDate(m.target)}</td>
    <td class="data-table__td">{m.progress}%</td>
    <td class="data-table__td">{m.completedCount}/{m.taskCount}</td>
    <td class="data-table__td">
      <Highlight text={m.project ?? ""} q={q} />
    </td>
    <td class="data-table__td">{formatDate(m.createdAt)}</td>
    <td class="data-table__td">{timeAgo(m.createdAt)}</td>
    <td class="data-table__td">
      {m.status !== "completed" && m.target
        ? (
          <span class={dueIn(m.target).includes("overdue") ? "text-error" : ""}>
            {dueIn(m.target)}
          </span>
        )
        : ""}
    </td>
    <td class="data-table__td">{formatDate(m.completedAt)}</td>
    <td class="data-table__td">{duration(m.createdAt, m.completedAt)}</td>
    <td class="data-table__td">
      <span class={varianceClass(m.target, m.completedAt)}>
        {variance(m.target, m.completedAt)}
      </span>
    </td>
    <td class="data-table__td">
      <div class="milestone-card__actions">
        <a class="btn btn--secondary btn--sm" href={`/milestones/${m.id}`}>
          View
        </a>
        <button
          class="btn btn--secondary btn--sm"
          type="button"
          hx-get={`/milestones/${m.id}/edit`}
          hx-target="#milestone-form-container"
          hx-swap="innerHTML"
        >
          Edit
        </button>
        <button
          class="btn btn--danger btn--sm"
          type="button"
          hx-delete={`/milestones/${m.id}`}
          hx-swap="none"
          hx-confirm-dialog={`Delete "${m.name}"? This cannot be undone.`}
          data-confirm-name={m.name}
        >
          Delete
        </button>
      </div>
    </td>
  </tr>
);
