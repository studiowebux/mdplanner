import type { FC } from "hono/jsx";
import type { Quote } from "../../types/quote.types.ts";
import { DomainCard } from "../../components/ui/domain-card.tsx";
import { CardMeta, CardMetaItem } from "./card-meta.tsx";
import { QUOTE_STATUS_VARIANTS } from "../../domains/quote/constants.tsx";
import { badgeClass } from "../../components/ui/status-badge.tsx";
import { formatCurrency } from "../../utils/format.ts";
import { getCustomerService } from "../../singletons/services.ts";

type Props = { item: Quote; q?: string };

export const QuoteCard: FC<Props> = async ({ item, q }) => {
  const customer = await getCustomerService().getById(item.customerId);

  return (
    <DomainCard
      href={`/quotes/${item.id}`}
      name={`${item.number} — ${item.title}`}
      q={q}
      domain="quotes"
      id={item.id}
    >
      <CardMeta>
        <CardMetaItem label="Customer">
          <a href={`/customers/${item.customerId}`}>
            {customer?.name ?? item.customerId}
          </a>
        </CardMetaItem>
        <CardMetaItem label="Status">
          <span class={badgeClass(QUOTE_STATUS_VARIANTS, item.status)}>
            {item.status}
          </span>
        </CardMetaItem>
        <CardMetaItem label="Total">
          {formatCurrency(item.total) || "$0"}
        </CardMetaItem>
        {item.expiresAt && (
          <CardMetaItem label="Expires">{item.expiresAt}</CardMetaItem>
        )}
      </CardMeta>
    </DomainCard>
  );
};
