import type { FC } from "hono/jsx";
import type { Moscow } from "../../types/moscow.types.ts";
import { DomainCard } from "../../components/ui/domain-card.tsx";
import { CardMeta, CardMetaItem } from "./card-meta.tsx";
import { toKebab } from "../../utils/slug.ts";
import { formatDate } from "../../utils/time.ts";

type Props = { item: Moscow; q?: string };

export const MoscowCard: FC<Props> = ({ item, q }) => {
  return (
    <DomainCard
      href={`/moscow/${item.id}`}
      name={item.title}
      q={q}
      domain="moscow"
      id={item.id}
      badge={
        <span class="badge moscow-date-badge">{formatDate(item.date)}</span>
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
      <div class="moscow-card__counts">
        <span class="badge moscow-card__count--m">M {item.must.length}</span>
        <span class="badge moscow-card__count--s">S {item.should.length}</span>
        <span class="badge moscow-card__count--c">C {item.could.length}</span>
        <span class="badge moscow-card__count--w">W {item.wont.length}</span>
      </div>
    </DomainCard>
  );
};
