// Print-only invoice view — no app shell, no scripts, no SSE.
// Auto-fires window.print() on load via a small nonce'd inline script.
// Triggered by clicking the Print button on the detail page (target=_blank).

import type { FC } from "hono/jsx";
import type { Invoice } from "../types/invoice.types.ts";
import type { ProjectConfig } from "../types/project.types.ts";
import { formatDate } from "../utils/time.ts";
import { formatCurrency } from "../utils/format.ts";
import { MarkdownSection } from "./components/markdown-section.tsx";
import { InfoItem } from "./components/info-item.tsx";
import { LineItemsTable } from "./components/line-items-table.tsx";
import { BillingTotals } from "./components/billing-totals.tsx";
import { INVOICE_STATUS_VARIANTS } from "../domains/invoice/constants.tsx";
import { badgeClass } from "../components/ui/status-badge.tsx";
import { BillingDocumentHeader } from "./components/billing-document-header.tsx";

const PRINT_SCRIPT =
  `window.addEventListener("load",function(){setTimeout(function(){window.print();},50);});`;

type Props = {
  invoice: Invoice;
  displayStatus: string;
  billingConfig: ProjectConfig;
  nonce?: string;
};

export const InvoicePrintView: FC<Props> = (
  { invoice, displayStatus, billingConfig, nonce },
) => {
  const balance = invoice.total - invoice.paidAmount;
  const title = `${invoice.number} — ${invoice.title}`;

  return (
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <title>{title}</title>
        <link rel="stylesheet" href="/css/index.css" />
        <link rel="stylesheet" href="/css/components.css" />
        <link rel="stylesheet" href="/css/views/invoices.css" />
        <link rel="stylesheet" href="/css/views/billing.css" />
        <script
          nonce={nonce}
          dangerouslySetInnerHTML={{ __html: PRINT_SCRIPT }}
        />
      </head>
      <body>
        <main class="detail-view invoice-detail">
          <BillingDocumentHeader config={billingConfig} />

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
          </header>

          <div class="detail-section detail-info-row">
            <InfoItem label="Customer">{invoice.customerId}</InfoItem>
            {invoice.quoteId && (
              <InfoItem label="Quote">{invoice.quoteId}</InfoItem>
            )}
            {invoice.currency && (
              <InfoItem label="Currency">{invoice.currency}</InfoItem>
            )}
            {invoice.dueDate && (
              <InfoItem label="Due">{invoice.dueDate}</InfoItem>
            )}
            {invoice.paymentTerms && (
              <InfoItem label="Terms">{invoice.paymentTerms}</InfoItem>
            )}
          </div>

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

          {(invoice.footer || billingConfig.billingDefaultFooter) && (
            <section class="detail-section invoice-detail__footer">
              <h2 class="section-heading">Terms</h2>
              <p>{invoice.footer || billingConfig.billingDefaultFooter}</p>
            </section>
          )}

          <MarkdownSection title="Notes" markdown={invoice.notes} />

          {(invoice.sentAt || invoice.paidAt) && (
            <div class="detail-section invoice-detail__meta">
              {invoice.sentAt && <span>Sent {formatDate(invoice.sentAt)}</span>}
              {invoice.paidAt && <span>Paid {formatDate(invoice.paidAt)}</span>}
            </div>
          )}
        </main>
      </body>
    </html>
  );
};
