import type { FC } from "hono/jsx";
import type { Safe } from "../../types/safe.types.ts";
import { DomainCard } from "../../components/ui/domain-card.tsx";
import { CardMeta, CardMetaItem } from "./card-meta.tsx";
import { badgeClass } from "../../components/ui/status-badge.tsx";
import { SAFE_STATUS_VARIANTS } from "../../domains/safe/constants.tsx";

type Props = { item: Safe; q?: string };

export const SafeCard: FC<Props> = ({ item, q }) => {
  return (
    <DomainCard
      href={`/safe/${item.id}`}
      name={item.investor}
      q={q}
      domain="safe"
      id={item.id}
      badge={
        <span class={badgeClass(SAFE_STATUS_VARIANTS, item.status)}>
          {item.status}
        </span>
      }
    >
      <CardMeta>
        <CardMetaItem label="Amount">
          ${item.amount.toLocaleString()}
        </CardMetaItem>
        <CardMetaItem label="Type">{item.type}</CardMetaItem>
        {item.valuation_cap > 0 && (
          <CardMetaItem label="Cap">
            ${item.valuation_cap.toLocaleString()}
          </CardMetaItem>
        )}
        {item.discount > 0 && (
          <CardMetaItem label="Discount">{item.discount}%</CardMetaItem>
        )}
      </CardMeta>
    </DomainCard>
  );
};
