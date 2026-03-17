import type { FC } from "hono/jsx";
import type { Milestone } from "../../types/milestone.types.ts";
import { timeAgo, duration, variance, dueIn, formatDate } from "../../utils/time.ts";
import { Highlight } from "../../utils/highlight.tsx";

type Props = { milestone: Milestone; q?: string };

export const MilestoneRow: FC<Props> = ({ milestone: m, q }) => (
  <tr class="data-table__row" data-row-id={m.id}>
    <td class="data-table__td"><Highlight text={m.name} q={q} /></td>
    <td class="data-table__td">
      <span class={`milestone-card__badge milestone-card__badge--${m.status}`}>
        {m.status}
      </span>
    </td>
    <td class="data-table__td">{formatDate(m.target)}</td>
    <td class="data-table__td">{m.progress}%</td>
    <td class="data-table__td">{m.completedCount}/{m.taskCount}</td>
    <td class="data-table__td"><Highlight text={m.project ?? ""} q={q} /></td>
    <td class="data-table__td">{formatDate(m.createdAt)}</td>
    <td class="data-table__td">{timeAgo(m.createdAt)}</td>
    <td class="data-table__td">
      {m.status !== "completed" && m.target
        ? <span class={dueIn(m.target).includes("overdue") ? "text-error" : ""}>{dueIn(m.target)}</span>
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
        <button
          class="btn btn--secondary btn--sm"
          type="button"
          data-sidenav-open="milestone-form"
          data-milestone-action="edit"
          data-milestone-id={m.id}
          data-milestone-name={m.name}
          data-milestone-status={m.status}
          data-milestone-target={m.target ?? ""}
          data-milestone-description={m.description ?? ""}
          data-milestone-project={m.project ?? ""}
        >
          Edit
        </button>
        <button
          class="btn btn--danger btn--sm"
          type="button"
          data-milestone-action="delete"
          data-milestone-id={m.id}
          data-milestone-name={m.name}
        >
          Delete
        </button>
      </div>
    </td>
  </tr>
);

function varianceClass(target?: string, completedAt?: string): string {
  if (!target || !completedAt) return "";
  const diff = new Date(completedAt).getTime() - new Date(target).getTime();
  if (diff > 0) return "text-error";
  if (diff < 0) return "text-success";
  return "text-success";
}
