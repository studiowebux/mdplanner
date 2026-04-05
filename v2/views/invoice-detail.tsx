import type { FC } from "hono/jsx";
import { MainLayout } from "../components/layout/main.tsx";
import { BackButton } from "./components/back-button.tsx";
import type { Invoice } from "../types/invoice.types.ts";
import type { ViewProps } from "../types/app.ts";
import { formatDate } from "../utils/time.ts";
import { formatCurrency } from "../utils/format.ts";
import { MarkdownSection } from "./components/markdown-section.tsx";
import { DetailActions } from "./components/detail-actions.tsx";
import { SseRefresh } from "./components/sse-refresh.tsx";
import { InfoItem } from "./components/info-item.tsx";
import { LineItemsTable } from "./components/line-items-table.tsx";
import { BillingTotals } from "./components/billing-totals.tsx";
import { INVOICE_STATUS_VARIANTS } from "../domains/invoice/constants.tsx";
import { badgeClass } from "../components/ui/status-badge.tsx";
import { AuditMeta } from "./components/audit-meta.tsx";

// ---------------------------------------------------------------------------
// Main view
// ---------------------------------------------------------------------------

export const InvoiceDetailView: FC<
  ViewProps & { item: Invoice; displayStatus: string }
> = (
  { item: invoice, displayStatus, ...viewProps },
) => {
  const balance = invoice.total - invoice.paidAmount;

  return (
    <MainLayout
      title={`${invoice.number} — ${invoice.title}`}
      {...viewProps}
      styles={["/css/views/invoices.css", "/css/views/billing.css"]}
    >
      <SseRefresh
        getUrl={"/invoices/" + invoice.id}
        trigger="sse:invoice.updated"
        targetId="invoice-detail-root"
      />
      <main id="invoice-detail-root" class="detail-view invoice-detail">
        <BackButton href="/invoices" label="Back to Invoices" />

        {/* -- Header ---------------------------------------------------- */}
        <header class="detail-section invoice-detail__header">
          <div class="detail-title-row invoice-detail__title-row">
            <h1 class="detail-title invoice-detail__title">
              {invoice.number}
              <span class="invoice-detail__title-sep">&mdash;</span>
              {invoice.title}
            </h1>
            <span class={badgeClass(INVOICE_STATUS_VARIANTS, displayStatus)}>
              {displayStatus}
            </span>
          </div>
          <div class="invoice-detail__actions-row">
            <DetailActions
              entity="invoices"
              id={invoice.id}
              title={invoice.title}
              formContainerId="invoices-form-container"
            />
            {invoice.status === "draft" && (
              <button
                class="btn btn--primary btn--sm"
                type="button"
                hx-post={`/api/v1/invoices/${invoice.id}/send`}
                hx-confirm="Send this invoice?"
                hx-swap="none"
              >
                Send
              </button>
            )}
            <button
              class="btn btn--secondary btn--sm invoice-detail__print-btn"
              type="button"
              onclick="window.print()"
            >
              Print / Save as PDF
            </button>
          </div>
        </header>

        {/* -- Info ------------------------------------------------------- */}
        <div class="detail-section detail-info-row">
          <InfoItem label="Customer">
            <a href={`/customers/${invoice.customerId}`}>
              {invoice.customerId}
            </a>
          </InfoItem>
          {invoice.quoteId && (
            <InfoItem label="Quote">
              <a href={`/quotes/${invoice.quoteId}`}>{invoice.quoteId}</a>
            </InfoItem>
          )}
          {invoice.currency && (
            <InfoItem label="Currency">{invoice.currency}</InfoItem>
          )}
          {invoice.dueDate && <InfoItem label="Due">{invoice.dueDate}
          </InfoItem>}
          {invoice.paymentTerms && (
            <InfoItem label="Terms">{invoice.paymentTerms}</InfoItem>
          )}
        </div>

        {/* -- Balance --------------------------------------------------- */}
        <div class="detail-section invoice-detail__balance">
          <div class="invoice-detail__balance-item">
            <span class="invoice-detail__balance-label">Total</span>
            <span class="invoice-detail__balance-value">
              {formatCurrency(invoice.total) || "$0"}
            </span>
          </div>
          <div class="invoice-detail__balance-item">
            <span class="invoice-detail__balance-label">Paid</span>
            <span class="invoice-detail__balance-value invoice-detail__balance-value--paid">
              {formatCurrency(invoice.paidAmount) || "$0"}
            </span>
          </div>
          {balance > 0 && (
            <div class="invoice-detail__balance-item">
              <span class="invoice-detail__balance-label">Balance Due</span>
              <span class="invoice-detail__balance-value invoice-detail__balance-value--due">
                {formatCurrency(balance) || "$0"}
              </span>
            </div>
          )}
        </div>

        {/* -- Line items ------------------------------------------------ */}
        <section class="detail-section">
          <h2 class="section-heading">Line Items</h2>
          <LineItemsTable items={invoice.lineItems} />
          <BillingTotals
            subtotal={invoice.subtotal}
            tax={invoice.tax}
            taxRate={invoice.taxRate}
            total={invoice.total}
            paidAmount={invoice.paidAmount}
          />
        </section>

        {/* -- Footer ---------------------------------------------------- */}
        {invoice.footer && (
          <section class="detail-section invoice-detail__footer">
            <h2 class="section-heading">Terms</h2>
            <p>{invoice.footer}</p>
          </section>
        )}

        {/* -- Notes ------------------------------------------------------ */}
        <MarkdownSection title="Notes" markdown={invoice.notes} />

        {/* -- Meta ------------------------------------------------------- */}
        <div class="detail-section invoice-detail__meta">
          <span>Created {formatDate(invoice.createdAt)}</span>
          {invoice.sentAt && (
            <span>&middot; Sent {formatDate(invoice.sentAt)}</span>
          )}
          {invoice.paidAt && (
            <span>&middot; Paid {formatDate(invoice.paidAt)}</span>
          )}
          {invoice.updatedAt && invoice.updatedAt !== invoice.createdAt && (
            <span>&middot; Updated {formatDate(invoice.updatedAt)}</span>
          )}
        </div>
        <AuditMeta
          createdAt={invoice.createdAt}
          updatedAt={invoice.updatedAt}
          createdBy={invoice.createdBy}
          updatedBy={invoice.updatedBy}
        />
      </main>

      <div id="invoices-form-container" />
    </MainLayout>
  );
};
