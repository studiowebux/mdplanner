import type { FC } from "hono/jsx";
import type { Investor } from "../../types/investor.types.ts";
import { DomainCard } from "../../components/ui/domain-card.tsx";
import { CardMeta, CardMetaItem } from "./card-meta.tsx";
import { badgeClass } from "../../components/ui/status-badge.tsx";
import {
  INVESTOR_STATUS_VARIANTS,
  INVESTOR_TYPE_LABELS,
} from "../../domains/investor/constants.tsx";

type Props = { item: Investor; q?: string };

export const InvestorCard: FC<Props> = ({ item, q }) => {
  return (
    <DomainCard
      href={`/investors/${item.id}`}
      name={item.name}
      q={q}
      domain="investors"
      id={item.id}
      badge={
        <span class={badgeClass(INVESTOR_STATUS_VARIANTS, item.status)}>
          {item.status.replace(/_/g, " ")}
        </span>
      }
    >
      <CardMeta>
        <CardMetaItem label="Type">
          {INVESTOR_TYPE_LABELS[item.type]}
        </CardMetaItem>
        <CardMetaItem label="Stage">{item.stage}</CardMetaItem>
        {item.contact && (
          <CardMetaItem label="Contact">{item.contact}</CardMetaItem>
        )}
        {item.amountTarget != null && (
          <CardMetaItem label="Target">
            ${item.amountTarget.toLocaleString()}
          </CardMetaItem>
        )}
      </CardMeta>
    </DomainCard>
  );
};
