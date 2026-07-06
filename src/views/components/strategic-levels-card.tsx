import type { FC } from "hono/jsx";
import type { StrategicLevelsBuilder } from "../../types/strategic-levels.types.ts";
import { LEVEL_ORDER } from "../../types/strategic-levels.types.ts";
import { DomainCard } from "../../components/ui/domain-card.tsx";
import { CardMeta, CardMetaItem } from "./card-meta.tsx";

type Props = { item: StrategicLevelsBuilder; q?: string };

export const StrategicLevelsCard: FC<Props> = ({ item }) => {
  const counts = LEVEL_ORDER.map((lt) => ({
    label: lt.charAt(0).toUpperCase() + lt.slice(1),
    count: item.levels.filter((l) => l.level === lt).length,
  })).filter((e) => e.count > 0);

  return (
    <DomainCard
      href={`/strategic-levels/${item.id}`}
      name={item.title}
      domain="strategic-levels"
      id={item.id}
    >
      <CardMeta>
        <CardMetaItem label="Date">{item.date}</CardMetaItem>
        <CardMetaItem label="Levels">{String(item.levels.length)}</CardMetaItem>
        {counts.slice(0, 3).map((e) => (
          <CardMetaItem key={e.label} label={e.label}>
            {String(e.count)}
          </CardMetaItem>
        ))}
      </CardMeta>
    </DomainCard>
  );
};
