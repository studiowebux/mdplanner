import type { FC } from "hono/jsx";
import { MainLayout } from "../components/layout/main.tsx";
import { BackButton } from "./components/back-button.tsx";
import type { Payment } from "../types/payment.types.ts";
import type { ViewProps } from "../types/app.ts";
import { formatDate } from "../utils/time.ts";
import { formatCurrency } from "../utils/format.ts";
import { MarkdownSection } from "./components/markdown-section.tsx";
import { DetailActions } from "./components/detail-actions.tsx";
import { SseRefresh } from "./components/sse-refresh.tsx";
import { InfoItem } from "./components/info-item.tsx";
import { PAYMENT_METHOD_VARIANTS } from "../domains/payment/constants.tsx";

// ---------------------------------------------------------------------------
// Main view
// ---------------------------------------------------------------------------

export const PaymentDetailView: FC<
  ViewProps & { item: Payment }
> = (
  { item: payment, ...viewProps },
) => {
  const methodVariant = payment.method
    ? PAYMENT_METHOD_VARIANTS[payment.method] ?? "neutral"
    : null;

  return (
    <MainLayout
      title={`Payment — ${payment.reference ?? payment.id}`}
      {...viewProps}
      styles={["/css/views/payments.css"]}
    >
      <SseRefresh
        getUrl={"/payments/" + payment.id}
        trigger="sse:payment.updated"
        targetId="payment-detail-root"
      />
      <main id="payment-detail-root" class="detail-view payment-detail">
        <BackButton href="/payments" label="Back to Payments" />

        {/* -- Header ---------------------------------------------------- */}
        <header class="detail-section payment-detail__header">
          <div class="detail-title-row payment-detail__title-row">
            <h1 class="detail-title payment-detail__title">
              {payment.reference ?? payment.id}
            </h1>
          </div>
          <DetailActions
            entity="payments"
            id={payment.id}
            title={payment.reference ?? payment.id}
            formContainerId="payments-form-container"
          />
        </header>

        {/* -- Amount ---------------------------------------------------- */}
        <div class="detail-section payment-detail__amount-section">
          <span class="payment-detail__amount">
            {formatCurrency(payment.amount) || "$0"}
          </span>
        </div>

        {/* -- Info ------------------------------------------------------- */}
        <div class="detail-section detail-info-row">
          <InfoItem label="Date">{payment.date}</InfoItem>
          <InfoItem label="Invoice">
            <a href={`/invoices/${payment.invoiceId}`}>
              {payment.invoiceId}
            </a>
          </InfoItem>
          {payment.method && (
            <InfoItem label="Method">
              <span class={`badge badge--${methodVariant}`}>
                {payment.method}
              </span>
            </InfoItem>
          )}
          {payment.reference && (
            <InfoItem label="Reference">{payment.reference}</InfoItem>
          )}
        </div>

        {/* -- Notes ------------------------------------------------------ */}
        <MarkdownSection title="Notes" markdown={payment.notes} />

        {/* -- Meta ------------------------------------------------------- */}
        <div class="detail-section payment-detail__meta">
          <span>Created {formatDate(payment.createdAt)}</span>
          {payment.updatedAt && payment.updatedAt !== payment.createdAt && (
            <span>&middot; Updated {formatDate(payment.updatedAt)}</span>
          )}
        </div>
      </main>

      <div id="payments-form-container" />
    </MainLayout>
  );
};
