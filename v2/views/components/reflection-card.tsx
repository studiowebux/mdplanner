import type { FC } from "hono/jsx";
import type { Reflection } from "../../types/reflection.types.ts";
import { REFLECTION_PERIOD_LABELS } from "../../types/reflection.types.ts";
import { DomainCard } from "../../components/ui/domain-card.tsx";
import { CardMeta, CardMetaItem } from "./card-meta.tsx";
import { badgeClass } from "../../components/ui/status-badge.tsx";
import { REFLECTION_PERIOD_VARIANTS } from "../../domains/reflection/constants.tsx";

type Props = { item: Reflection; q?: string };

export const ReflectionCard: FC<Props> = ({ item, q }) => {
  return (
    <DomainCard
      href={`/reflections/${item.id}`}
      name={item.title}
      q={q}
      domain="reflections"
      id={item.id}
      badge={
        <span class={badgeClass(REFLECTION_PERIOD_VARIANTS, item.period)}>
          {REFLECTION_PERIOD_LABELS[item.period]}
        </span>
      }
    >
      <CardMeta>
        <CardMetaItem label="Date">{item.date}</CardMetaItem>
        {item.tags && item.tags.length > 0 && (
          <CardMetaItem label="Tags">{item.tags.join(", ")}</CardMetaItem>
        )}
      </CardMeta>
    </DomainCard>
  );
};
