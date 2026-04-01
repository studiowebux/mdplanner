import type { FC } from "hono/jsx";
import { MainLayout } from "../components/layout/main.tsx";
import { BackButton } from "./components/back-button.tsx";
import type { Quote } from "../types/quote.types.ts";
import type { ViewProps } from "../types/app.ts";
import { formatDate } from "../utils/time.ts";
import { MarkdownSection } from "./components/markdown-section.tsx";
import { DetailActions } from "./components/detail-actions.tsx";
import { SseRefresh } from "./components/sse-refresh.tsx";
import { InfoItem } from "./components/info-item.tsx";
import { LineItemsTable } from "./components/line-items-table.tsx";
import { BillingTotals } from "./components/billing-totals.tsx";
import { QUOTE_STATUS_VARIANTS } from "../domains/quote/constants.tsx";
import { badgeClass } from "../components/ui/status-badge.tsx";

// ---------------------------------------------------------------------------
// Main view
// ---------------------------------------------------------------------------

export const QuoteDetailView: FC<
  ViewProps & { item: Quote }
> = (
  { item: quote, ...viewProps },
) => {
  const hasSchedule = quote.paymentSchedule && quote.paymentSchedule.length > 0;

  return (
    <MainLayout
      title={`${quote.number} — ${quote.title}`}
      {...viewProps}
      styles={["/css/views/quotes.css", "/css/views/billing.css"]}
    >
      <SseRefresh
        getUrl={"/quotes/" + quote.id}
        trigger="sse:quote.updated"
        targetId="quote-detail-root"
      />
      <main id="quote-detail-root" class="detail-view quote-detail">
        <BackButton href="/quotes" label="Back to Quotes" />

        {/* -- Header ---------------------------------------------------- */}
        <header class="detail-section quote-detail__header">
          <div class="detail-title-row quote-detail__title-row">
            <h1 class="detail-title quote-detail__title">
              {quote.number}
              <span class="quote-detail__title-sep">&mdash;</span>
              {quote.title}
            </h1>
            <span class={badgeClass(QUOTE_STATUS_VARIANTS, quote.status)}>
              {quote.status}
            </span>
          </div>
          <div class="quote-detail__actions-row">
            <DetailActions
              entity="quotes"
              id={quote.id}
              title={quote.title}
              formContainerId="quotes-form-container"
            />
            {quote.status === "draft" && (
              <button
                class="btn btn--primary btn--sm"
                type="button"
                hx-post={`/api/v1/quotes/${quote.id}/send`}
                hx-confirm="Send this quote?"
                hx-swap="none"
              >
                Send
              </button>
            )}
            {quote.status === "sent" && (
              <>
                <button
                  class="btn btn--success btn--sm"
                  type="button"
                  hx-post={`/api/v1/quotes/${quote.id}/accept`}
                  hx-confirm="Accept this quote?"
                  hx-swap="none"
                >
                  Accept
                </button>
                <button
                  class="btn btn--danger btn--sm"
                  type="button"
                  hx-post={`/api/v1/quotes/${quote.id}/reject`}
                  hx-confirm="Reject this quote?"
                  hx-swap="none"
                >
                  Reject
                </button>
              </>
            )}
          </div>
        </header>

        {/* -- Info ------------------------------------------------------- */}
        <div class="detail-section detail-info-row">
          <InfoItem label="Customer">
            <a href={`/customers/${quote.customerId}`}>{quote.customerId}</a>
          </InfoItem>
          {quote.currency && (
            <InfoItem label="Currency">{quote.currency}</InfoItem>
          )}
          {quote.expiresAt && (
            <InfoItem label="Expires">{quote.expiresAt}</InfoItem>
          )}
          {quote.revision && (
            <InfoItem label="Revision">v{quote.revision}</InfoItem>
          )}
        </div>

        {/* -- Line items ------------------------------------------------ */}
        <section class="detail-section">
          <h2 class="section-heading">Line Items</h2>
          <LineItemsTable items={quote.lineItems} showOptional />
          <BillingTotals
            subtotal={quote.subtotal}
            tax={quote.tax}
            taxRate={quote.taxRate}
            total={quote.total}
          />
        </section>

        {/* -- Payment schedule ------------------------------------------ */}
        {hasSchedule && (
          <section class="detail-section">
            <h2 class="section-heading">Payment Schedule</h2>
            <table class="data-table">
              <thead>
                <tr>
                  <th>Description</th>
                  <th>%</th>
                  <th>Amount</th>
                  <th>Due</th>
                </tr>
              </thead>
              <tbody>
                {quote.paymentSchedule!.map((ps) => (
                  <tr>
                    <td>{ps.description}</td>
                    <td>{ps.percent != null ? `${ps.percent}%` : ""}</td>
                    <td>{ps.amount != null ? String(ps.amount) : ""}</td>
                    <td>{ps.dueDate ?? ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {/* -- Footer ---------------------------------------------------- */}
        {quote.footer && (
          <section class="detail-section quote-detail__footer">
            <h2 class="section-heading">Terms</h2>
            <p>{quote.footer}</p>
          </section>
        )}

        {/* -- Notes ------------------------------------------------------ */}
        <MarkdownSection title="Notes" markdown={quote.notes} />

        {/* -- Meta ------------------------------------------------------- */}
        <div class="detail-section quote-detail__meta">
          <span>Created {formatDate(quote.createdAt)}</span>
          {quote.sentAt && <span>&middot; Sent {formatDate(quote.sentAt)}
          </span>}
          {quote.acceptedAt && (
            <span>&middot; Accepted {formatDate(quote.acceptedAt)}</span>
          )}
          {quote.updatedAt && quote.updatedAt !== quote.createdAt && (
            <span>&middot; Updated {formatDate(quote.updatedAt)}</span>
          )}
        </div>
      </main>

      <div id="quotes-form-container" />
    </MainLayout>
  );
};
