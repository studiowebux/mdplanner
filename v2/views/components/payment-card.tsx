import type { FC } from "hono/jsx";
import type { Payment } from "../../types/payment.types.ts";
import { DomainCard } from "../../components/ui/domain-card.tsx";
import { CardMeta, CardMetaItem } from "./card-meta.tsx";
import { PAYMENT_METHOD_VARIANTS } from "../../domains/payment/constants.tsx";
import { formatCurrency } from "../../utils/format.ts";
import { getInvoiceService } from "../../singletons/services.ts";

type Props = { item: Payment; q?: string };

export const PaymentCard: FC<Props> = async ({ item, q }) => {
  const methodVariant = item.method
    ? PAYMENT_METHOD_VARIANTS[item.method] ?? "neutral"
    : null;
  const invoice = await getInvoiceService().getById(item.invoiceId);
  const invoiceLabel = invoice
    ? `${invoice.number} — ${invoice.title}`
    : item.invoiceId;

  return (
    <DomainCard
      href={`/payments/${item.id}`}
      name={item.reference ?? item.date}
      q={q}
      domain="payments"
      id={item.id}
    >
      <CardMeta>
        <CardMetaItem label="Date">{item.date}</CardMetaItem>
        <CardMetaItem label="Amount">
          {formatCurrency(item.amount) || "$0"}
        </CardMetaItem>
        {item.method && (
          <CardMetaItem label="Method">
            <span class={`badge badge--${methodVariant}`}>{item.method}</span>
          </CardMetaItem>
        )}
        <CardMetaItem label="Invoice">
          <a href={`/invoices/${item.invoiceId}`}>{invoiceLabel}</a>
        </CardMetaItem>
      </CardMeta>
    </DomainCard>
  );
};
