import type { FC } from "hono/jsx";
import { MainLayout } from "../components/layout/main.tsx";
import { BackButton } from "./components/back-button.tsx";
import { Breadcrumb } from "../components/ui/breadcrumb.tsx";
import type { Invoice } from "../types/invoice.types.ts";
import type { ViewProps } from "../types/app.ts";
import type { ProjectConfig } from "../types/project.types.ts";
import { formatDate } from "../utils/time.ts";
import { formatCurrency } from "../utils/format.ts";
import { MarkdownSection } from "./components/markdown-section.tsx";
import { DetailActions } from "./components/detail-actions.tsx";
import { ArchivedBanner } from "./components/archived-banner.tsx";
import { SseRefresh } from "./components/sse-refresh.tsx";
import { InfoItem } from "./components/info-item.tsx";
import { LineItemsTable } from "./components/line-items-table.tsx";
import { BillingTotals } from "./components/billing-totals.tsx";
import { INVOICE_STATUS_VARIANTS } from "../domains/invoice/constants.tsx";
import { badgeClass } from "../components/ui/status-badge.tsx";
import { AuditMeta } from "./components/audit-meta.tsx";
import { BillingDocumentHeader } from "./components/billing-document-header.tsx";
import { EditModeToggle } from "./components/edit-mode-toggle.tsx";

// ---------------------------------------------------------------------------
// Shared inline-editable section for `notes` and `footer`.
// ---------------------------------------------------------------------------

const InlineEditSection: FC<{
  invoice: Invoice;
  field: "notes" | "footer";
  title: string;
}> = ({ invoice, field, title }) => {
  const value = (invoice[field] ?? "") as string;
  const inputId = `invoice-${field}-value`;
  const btnId = `invoice-${field}-save`;
  return (
    <section class="detail-section">
      <h2 class="section-heading">{title}</h2>
      <div
        class="inline-editable"
        contenteditable
        data-inline-edit
        data-inline-original={value}
        data-inline-target={inputId}
        data-inline-save-btn={btnId}
      >
        {value}
      </div>
      <input type="hidden" id={inputId} name={field} value={value} />
      <div class="inline-editable__actions">
        <button
          type="button"
          id={btnId}
          class="btn btn--primary btn--sm is-hidden"
          hx-put={`/invoices/${invoice.id}/${field}?editing=true`}
          hx-include={`#${inputId}`}
          hx-target="#invoice-detail-root"
          hx-select="#invoice-detail-root"
          hx-swap="outerHTML"
        >
          Save
        </button>
      </div>
    </section>
  );
};

// ---------------------------------------------------------------------------
// Main view
// ---------------------------------------------------------------------------

export const InvoiceDetailView: FC<
  ViewProps & {
    item: Invoice;
    displayStatus: string;
    billingConfig: ProjectConfig;
    editing?: boolean;
  }
> = (
  {
    item: invoice,
    displayStatus,
    billingConfig,
    editing = false,
    ...viewProps
  },
) => {
  const balance = invoice.total - invoice.paidAmount;

  return (
    <MainLayout
      title={`${invoice.number} — ${invoice.title}`}
      {...viewProps}
      styles={["/css/views/invoices.css", "/css/views/billing.css"]}
      scripts={["/js/inline-edit.js"]}
    >
      <SseRefresh
        getUrl={"/invoices/" + invoice.id + (editing ? "?editing=true" : "")}
        trigger="sse:invoice.updated"
        targetId="invoice-detail-root"
      />
      <main
        id="invoice-detail-root"
        class={`detail-view invoice-detail${
          editing ? " invoice-detail--editing" : ""
        }`}
      >
        <Breadcrumb
          items={[
            { label: "Invoices", href: "/invoices" },
            { label: invoice.number },
          ]}
        />
        <BackButton href="/invoices" label="Back to Invoices" />

        <BillingDocumentHeader config={billingConfig} />

        {/* -- Header ---------------------------------------------------- */}
        <header class="detail-section detail-header invoice-detail__header">
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
              archived={invoice.archived === true}
            >
              <EditModeToggle
                href={`/invoices/${invoice.id}`}
                editing={editing}
              />
            </DetailActions>
            {invoice.status === "draft" && (
              <button
                class="btn btn--primary btn--sm"
                type="button"
                hx-post={`/invoices/${invoice.id}/send`}
                hx-confirm="Send this invoice?"
                hx-swap="none"
              >
                Send
              </button>
            )}
            <a
              class="btn btn--secondary btn--sm invoice-detail__print-btn"
              href={`/invoices/${invoice.id}/print`}
              target="_blank"
              rel="noopener"
            >
              Print / Save as PDF
            </a>
          </div>
        </header>

        <ArchivedBanner entity={invoice} />

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
        {editing
          ? <InlineEditSection invoice={invoice} field="footer" title="Terms" />
          : (invoice.footer || billingConfig.billingDefaultFooter) && (
            <section class="detail-section invoice-detail__footer">
              <h2 class="section-heading">Terms</h2>
              <p>{invoice.footer || billingConfig.billingDefaultFooter}</p>
            </section>
          )}

        {/* -- Notes ------------------------------------------------------ */}
        {editing
          ? <InlineEditSection invoice={invoice} field="notes" title="Notes" />
          : <MarkdownSection title="Notes" markdown={invoice.notes} />}

        {/* -- Meta ------------------------------------------------------- */}
        {(invoice.sentAt || invoice.paidAt) && (
          <div class="detail-section invoice-detail__meta">
            {invoice.sentAt && <span>Sent {formatDate(invoice.sentAt)}</span>}
            {invoice.paidAt && <span>Paid {formatDate(invoice.paidAt)}</span>}
          </div>
        )}
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
