import type { FC } from "hono/jsx";
import type { BillingRate } from "../../types/billing-rate.types.ts";
import { DomainCard } from "../../components/ui/domain-card.tsx";
import { CardMeta, CardMetaItem } from "./card-meta.tsx";
import {
  formatRate,
  UNIT_LABELS,
} from "../../domains/billing-rate/constants.tsx";

type Props = { item: BillingRate; q?: string };

export const BillingRateCard: FC<Props> = ({ item, q }) => {
  return (
    <DomainCard
      href={`/billing-rates/${item.id}`}
      name={item.name}
      q={q}
      domain="billing-rates"
      id={item.id}
    >
      <CardMeta>
        <CardMetaItem label="Rate">
          {formatRate(item.rate, item.unit)}
        </CardMetaItem>
        <CardMetaItem label="Unit">
          {UNIT_LABELS[item.unit] ?? item.unit}
        </CardMetaItem>
        {item.isDefault && (
          <CardMetaItem label="">
            <span class="badge badge--green">Default</span>
          </CardMetaItem>
        )}
      </CardMeta>
    </DomainCard>
  );
};
