// Print-only invoice view — no app shell, no scripts, no SSE.
// Auto-fires window.print() on load via a small nonce'd inline script.
// Triggered by clicking the Print button on the detail page (target=_blank).

import type { FC } from "hono/jsx";
import type { Invoice } from "../types/invoice.types.ts";
import type { Customer } from "../types/customer.types.ts";
import type { ProjectConfig } from "../types/project.types.ts";
import { formatDate } from "../utils/time.ts";
import { formatCurrency } from "../utils/format.ts";
import { MarkdownSection } from "./components/markdown-section.tsx";
import { LineItemsTable } from "./components/line-items-table.tsx";
import { BillingTotals } from "./components/billing-totals.tsx";
import { INVOICE_STATUS_VARIANTS } from "../domains/invoice/constants.tsx";
import { badgeClass } from "../components/ui/status-badge.tsx";
import { BillingDocumentHeader } from "./components/billing-document-header.tsx";
import { PrintBillTo } from "./components/print-bill-to.tsx";

type Props = {
  invoice: Invoice;
  displayStatus: string;
  billingConfig: ProjectConfig;
  customer: Customer | null;
  nonce?: string;
};

export const InvoicePrintView: FC<Props> = (
  { invoice, displayStatus, billingConfig, customer, nonce },
) => {
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
        <script src="/js/billing-print.js" nonce={nonce} />
      </head>
      <body>
        <main class="invoice-print">
          {/* 2-col header: sender LEFT, invoice meta RIGHT */}
          <header class="invoice-print__header">
            <div class="invoice-print__header-left">
              <BillingDocumentHeader config={billingConfig} />
            </div>
            <div class="invoice-print__header-right">
              <h1 class="invoice-print__label">INVOICE</h1>
              <dl class="invoice-print__meta">
                <div class="invoice-print__meta-row">
                  <dt class="invoice-print__meta-label">Number</dt>
                  <dd class="invoice-print__meta-value">{invoice.number}</dd>
                </div>
                {invoice.sentAt && (
                  <div class="invoice-print__meta-row">
                    <dt class="invoice-print__meta-label">Issued</dt>
                    <dd class="invoice-print__meta-value">
                      {formatDate(invoice.sentAt)}
                    </dd>
                  </div>
                )}
                {invoice.dueDate && (
                  <div class="invoice-print__meta-row">
                    <dt class="invoice-print__meta-label">Due</dt>
                    <dd class="invoice-print__meta-value">
                      {formatDate(invoice.dueDate)}
                    </dd>
                  </div>
                )}
                <div class="invoice-print__meta-row">
                  <dt class="invoice-print__meta-label">Status</dt>
                  <dd class="invoice-print__meta-value">
                    <span
                      class={badgeClass(INVOICE_STATUS_VARIANTS, displayStatus)}
                    >
                      {displayStatus}
                    </span>
                  </dd>
                </div>
              </dl>
            </div>
          </header>

          {/* Bill-to block */}
          <PrintBillTo customer={customer} />

          {/* Short description / summary */}
          {invoice.description && (
            <section class="invoice-print__description">
              <p>{invoice.description}</p>
            </section>
          )}

          {/* Line items */}
          <section class="invoice-print__items">
            <LineItemsTable items={invoice.lineItems} />
            <BillingTotals
              subtotal={invoice.subtotal}
              tax={invoice.tax}
              taxRate={invoice.taxRate}
              total={invoice.total}
              paidAmount={invoice.paidAmount}
            />
          </section>

          {/* Terms and Conditions (invoice-specific) */}
          {invoice.footer && (
            <section class="invoice-print__terms">
              <h2 class="invoice-print__terms-heading">Terms and Conditions</h2>
              <p>{invoice.footer}</p>
            </section>
          )}

          <MarkdownSection title="Notes" markdown={invoice.notes} />

          {/* Configurable footer from Settings → Billing */}
          {billingConfig.billingDefaultFooter && (
            <footer class="invoice-print__footer">
              <p>{billingConfig.billingDefaultFooter}</p>
            </footer>
          )}
        </main>
      </body>
    </html>
  );
};
