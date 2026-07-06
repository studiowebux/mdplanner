import type { FC } from "hono/jsx";
import type { Deal } from "../../types/deal.types.ts";
import { DomainCard } from "../../components/ui/domain-card.tsx";
import { CardMeta, CardMetaItem } from "./card-meta.tsx";
import { DEAL_STAGE_VARIANTS } from "../../domains/deal/constants.tsx";
import { DEAL_STAGE_LABELS } from "../../types/deal.types.ts";
import { badgeClass } from "../../components/ui/status-badge.tsx";

type Props = { item: Deal; q?: string };

export const DealCard: FC<Props> = ({ item, q }) => {
  return (
    <DomainCard
      href={`/deals/${item.id}`}
      name={item.title}
      q={q}
      domain="deals"
      id={item.id}
      badge={
        <span class={badgeClass(DEAL_STAGE_VARIANTS, item.stage)}>
          {DEAL_STAGE_LABELS[item.stage]}
        </span>
      }
    >
      <CardMeta>
        {item.company && (
          <CardMetaItem label="Company">{item.company}</CardMetaItem>
        )}
        {item.contact && (
          <CardMetaItem label="Contact">{item.contact}</CardMetaItem>
        )}
        {item.value != null && (
          <CardMetaItem label="Value">
            {item.value.toLocaleString()}
            {item.currency ? ` ${item.currency}` : ""}
          </CardMetaItem>
        )}
        {item.assignee && (
          <CardMetaItem label="Assignee">{item.assignee}</CardMetaItem>
        )}
      </CardMeta>
    </DomainCard>
  );
};
