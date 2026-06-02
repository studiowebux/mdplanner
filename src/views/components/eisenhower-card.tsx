import type { FC } from "hono/jsx";
import type { Eisenhower } from "../../types/eisenhower.types.ts";
import { DomainCard } from "../../components/ui/domain-card.tsx";
import { CardMeta, CardMetaItem } from "./card-meta.tsx";
import { toKebab } from "../../utils/slug.ts";
import { formatDate } from "../../utils/time.ts";

type Props = { item: Eisenhower; q?: string };

export const EisenhowerCard: FC<Props> = ({ item, q }) => {
  return (
    <DomainCard
      href={`/eisenhower/${item.id}`}
      name={item.title}
      q={q}
      domain="eisenhower"
      id={item.id}
      badge={
        <span class="badge eisenhower-date-badge">{formatDate(item.date)}</span>
      }
    >
      <CardMeta>
        {item.project && (
          <CardMetaItem label="Project">
            <a href={`/portfolio/${toKebab(item.project)}`}>
              {item.project}
            </a>
          </CardMetaItem>
        )}
      </CardMeta>
      <div class="eisenhower-card__counts">
        <span class="badge eisenhower-card__count--q1">
          Q1 {item.urgentImportant.length}
        </span>
        <span class="badge eisenhower-card__count--q2">
          Q2 {item.notUrgentImportant.length}
        </span>
        <span class="badge eisenhower-card__count--q3">
          Q3 {item.urgentNotImportant.length}
        </span>
        <span class="badge eisenhower-card__count--q4">
          Q4 {item.notUrgentNotImportant.length}
        </span>
      </div>
    </DomainCard>
  );
};
