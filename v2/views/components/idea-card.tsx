import type { FC } from "hono/jsx";
import type { Idea } from "../../types/idea.types.ts";
import { IDEA_COMPLETED_STATUSES } from "../../types/idea.types.ts";
import { DomainCard } from "../../components/ui/domain-card.tsx";
import { toKebab } from "../../utils/slug.ts";

type Props = { item: Idea; q?: string };

export const IdeaCard: FC<Props> = ({ item, q }) => {
  const isCompleted = IDEA_COMPLETED_STATUSES.has(item.status);
  const linkCount = item.links?.length ?? 0;
  const subtaskCount = item.subtasks?.length ?? 0;

  return (
    <DomainCard
      href={`/ideas/${item.id}`}
      name={item.title}
      q={q}
      domain="ideas"
      id={item.id}
      className={isCompleted ? "idea-card--completed" : undefined}
      badge={
        <>
          <span class={`badge idea-status idea-status--${item.status}`}>
            {item.status}
          </span>
          {item.priority && (
            <span class={`badge idea-priority--${item.priority}`}>
              {item.priority}
            </span>
          )}
        </>
      }
    >
      <dl class="domain-card__meta">
        {item.category && (
          <>
            <dt class="domain-card__meta-label">Category</dt>
            <dd class="domain-card__meta-value">{item.category}</dd>
          </>
        )}
        {item.project && (
          <>
            <dt class="domain-card__meta-label">Project</dt>
            <dd class="domain-card__meta-value">
              <a href={`/portfolio/${toKebab(item.project)}`}>
                {item.project}
              </a>
            </dd>
          </>
        )}
        {linkCount > 0 && (
          <>
            <dt class="domain-card__meta-label">Links</dt>
            <dd class="domain-card__meta-value">
              {linkCount} idea{linkCount !== 1 ? "s" : ""}
            </dd>
          </>
        )}
        {subtaskCount > 0 && (
          <>
            <dt class="domain-card__meta-label">Subtasks</dt>
            <dd class="domain-card__meta-value">{subtaskCount}</dd>
          </>
        )}
      </dl>
    </DomainCard>
  );
};
