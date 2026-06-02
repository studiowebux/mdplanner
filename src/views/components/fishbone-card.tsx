import type { FC } from "hono/jsx";
import type { Fishbone } from "../../types/fishbone.types.ts";
import { DomainCard } from "../../components/ui/domain-card.tsx";
import { CardMeta, CardMetaItem } from "./card-meta.tsx";
import { toKebab } from "../../utils/slug.ts";

type Props = { item: Fishbone; q?: string };

export const FishboneCard: FC<Props> = ({ item, q }) => {
  return (
    <DomainCard
      href={`/fishbones/${item.id}`}
      name={item.title}
      q={q}
      domain="fishbone"
      id={item.id}
      badge={
        <span class="badge">
          {item.causes.length} cause{item.causes.length !== 1 ? "s" : ""}
        </span>
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
        {item.description && (
          <CardMetaItem label="Problem">
            {item.description}
          </CardMetaItem>
        )}
      </CardMeta>
    </DomainCard>
  );
};
