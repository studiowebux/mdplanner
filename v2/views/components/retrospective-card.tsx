import type { FC } from "hono/jsx";
import type { Retrospective } from "../../types/retrospective.types.ts";
import { DomainCard } from "../../components/ui/domain-card.tsx";
import { CardMeta, CardMetaItem } from "./card-meta.tsx";

type Props = { item: Retrospective; q?: string };

function countItems(r: Retrospective): number {
  return r.continue.length + r.stop.length + r.start.length;
}

export const RetrospectiveCard: FC<Props> = ({ item, q }) => {
  return (
    <DomainCard
      href={`/retrospectives/${item.id}`}
      name={item.title}
      q={q}
      domain="retrospectives"
      id={item.id}
    >
      <CardMeta>
        {item.date && <CardMetaItem label="Date">{item.date}</CardMetaItem>}
        <CardMetaItem label="Status">
          <span
            class={`badge badge--${
              item.status === "closed" ? "success" : "warning"
            }`}
          >
            {item.status}
          </span>
        </CardMetaItem>
        <CardMetaItem label="Items">{countItems(item)}</CardMetaItem>
      </CardMeta>
    </DomainCard>
  );
};
