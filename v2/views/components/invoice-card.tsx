import type { FC } from "hono/jsx";
import type { Invoice } from "../../types/invoice.types.ts";
import { DomainCard } from "../../components/ui/domain-card.tsx";
import { CardMeta, CardMetaItem } from "./card-meta.tsx";
import { INVOICE_STATUS_VARIANTS } from "../../domains/invoice/constants.tsx";
import { badgeClass } from "../../components/ui/status-badge.tsx";
import { formatCurrency } from "../../utils/format.ts";
import { getInvoiceService } from "../../singletons/services.ts";

type Props = { item: Invoice; q?: string };

export const InvoiceCard: FC<Props> = ({ item, q }) => {
  const displayStatus = getInvoiceService().displayStatus(item);
  const balance = item.total - item.paidAmount;

  return (
    <DomainCard
      href={`/invoices/${item.id}`}
      name={`${item.number} — ${item.title}`}
      q={q}
      domain="invoices"
      id={item.id}
    >
      <CardMeta>
        <CardMetaItem label="Customer">{item.customerId}</CardMetaItem>
        <CardMetaItem label="Status">
          <span class={badgeClass(INVOICE_STATUS_VARIANTS, displayStatus)}>
            {displayStatus}
          </span>
        </CardMetaItem>
        <CardMetaItem label="Total">
          {formatCurrency(item.total) || "$0"}
        </CardMetaItem>
        {balance > 0 && (
          <CardMetaItem label="Balance">
            {formatCurrency(balance) || "$0"}
          </CardMetaItem>
        )}
      </CardMeta>
    </DomainCard>
  );
};
