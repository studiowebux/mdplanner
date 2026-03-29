import type { FC } from "hono/jsx";
import type { Idea } from "../../types/idea.types.ts";
import { IDEA_COMPLETED_STATUSES } from "../../types/idea.types.ts";
import { DomainCard } from "../../components/ui/domain-card.tsx";
import { CardMeta, CardMetaItem } from "./card-meta.tsx";
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
      <CardMeta>
        {item.category && (
          <CardMetaItem label="Category">{item.category}</CardMetaItem>
        )}
        {item.project && (
          <CardMetaItem label="Project">
            <a href={`/portfolio/${toKebab(item.project)}`}>
              {item.project}
            </a>
          </CardMetaItem>
        )}
        {linkCount > 0 && (
          <CardMetaItem label="Links">
            {linkCount} idea{linkCount !== 1 ? "s" : ""}
          </CardMetaItem>
        )}
        {subtaskCount > 0 && (
          <CardMetaItem label="Subtasks">{subtaskCount}</CardMetaItem>
        )}
      </CardMeta>
    </DomainCard>
  );
};
