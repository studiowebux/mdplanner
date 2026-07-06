import type { FC } from "hono/jsx";
import type { C4Component } from "../../types/c4.types.ts";
import { DomainCard } from "../../components/ui/domain-card.tsx";
import { CardMeta, CardMetaItem } from "./card-meta.tsx";
import { C4_LEVEL_LABELS } from "../../domains/c4/constants.tsx";

type Props = { item: C4Component; q?: string };

export const C4Card: FC<Props> = ({ item, q }) => (
  <DomainCard
    href={`/c4/${item.id}`}
    name={item.name}
    q={q}
    domain="c4"
    id={item.id}
    badge={
      <>
        <span class={`badge c4-level-badge c4-level-badge--${item.level}`}>
          {C4_LEVEL_LABELS[item.level] ?? item.level}
        </span>
        {item.type && <span class="badge">{item.type}</span>}
      </>
    }
  >
    <CardMeta>
      {item.technology && (
        <CardMetaItem label="Tech">{item.technology}</CardMetaItem>
      )}
      {item.parent && (
        <CardMetaItem label="Parent">
          <a href={`/c4/${item.parent}`}>{item.parent}</a>
        </CardMetaItem>
      )}
    </CardMeta>
    {item.description && <p class="domain-card__desc">{item.description}</p>}
  </DomainCard>
);
