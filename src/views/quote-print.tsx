// Print-only quote view — no app shell, no scripts, no SSE.
// Auto-fires window.print() on load via the shared billing-print.js.
// Triggered by clicking the Print button on the detail page (target=_blank).
// Reuses the invoice-print__* layout (invoices.css) — invoice and quote print
// docs share one stylesheet; no second print stylesheet is forked.

import type { FC } from "hono/jsx";
import type { Quote } from "../types/quote.types.ts";
import type { Customer } from "../types/customer.types.ts";
import type { ProjectConfig } from "../types/project.types.ts";
import { formatDate } from "../utils/time.ts";
import { MarkdownSection } from "./components/markdown-section.tsx";
import { LineItemsTable } from "./components/line-items-table.tsx";
import { BillingTotals } from "./components/billing-totals.tsx";
import { QUOTE_STATUS_VARIANTS } from "../domains/quote/constants.tsx";
import { badgeClass } from "../components/ui/status-badge.tsx";
import { BillingDocumentHeader } from "./components/billing-document-header.tsx";
import { PrintBillTo } from "./components/print-bill-to.tsx";

type Props = {
  quote: Quote;
  billingConfig: ProjectConfig;
  customer: Customer | null;
  nonce?: string;
};

export const QuotePrintView: FC<Props> = (
  { quote, billingConfig, customer, nonce },
) => {
  const title = `${quote.number} — ${quote.title}`;

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
          {/* 2-col header: sender LEFT, quote meta RIGHT */}
          <header class="invoice-print__header">
            <div class="invoice-print__header-left">
              <BillingDocumentHeader config={billingConfig} />
            </div>
            <div class="invoice-print__header-right">
              <h1 class="invoice-print__label">QUOTE</h1>
              <dl class="invoice-print__meta">
                <div class="invoice-print__meta-row">
                  <dt class="invoice-print__meta-label">Number</dt>
                  <dd class="invoice-print__meta-value">{quote.number}</dd>
                </div>
                {quote.sentAt && (
                  <div class="invoice-print__meta-row">
                    <dt class="invoice-print__meta-label">Issued</dt>
                    <dd class="invoice-print__meta-value">
                      {formatDate(quote.sentAt)}
                    </dd>
                  </div>
                )}
                {quote.expiresAt && (
                  <div class="invoice-print__meta-row">
                    <dt class="invoice-print__meta-label">Valid until</dt>
                    <dd class="invoice-print__meta-value">
                      {formatDate(quote.expiresAt)}
                    </dd>
                  </div>
                )}
                <div class="invoice-print__meta-row">
                  <dt class="invoice-print__meta-label">Status</dt>
                  <dd class="invoice-print__meta-value">
                    <span
                      class={badgeClass(QUOTE_STATUS_VARIANTS, quote.status)}
                    >
                      {quote.status}
                    </span>
                  </dd>
                </div>
              </dl>
            </div>
          </header>

          {/* Bill-to block */}
          <PrintBillTo customer={customer} />

          {/* Line items */}
          <section class="invoice-print__items">
            <LineItemsTable items={quote.lineItems} />
            <BillingTotals
              subtotal={quote.subtotal}
              tax={quote.tax}
              taxRate={quote.taxRate}
              total={quote.total}
            />
          </section>

          {/* Footer / terms */}
          {(quote.footer || billingConfig.billingDefaultFooter) && (
            <section class="invoice-print__footer">
              <p>{quote.footer ?? billingConfig.billingDefaultFooter}</p>
            </section>
          )}

          <MarkdownSection title="Notes" markdown={quote.notes} />
        </main>
      </body>
    </html>
  );
};
