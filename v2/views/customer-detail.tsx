import type { FC } from "hono/jsx";
import { MainLayout } from "../components/layout/main.tsx";
import { BackButton } from "./components/back-button.tsx";
import type { Customer } from "../types/customer.types.ts";
import type { Quote } from "../types/quote.types.ts";
import type { Invoice } from "../types/invoice.types.ts";
import type { ViewProps } from "../types/app.ts";
import { formatDate } from "../utils/time.ts";
import { formatCurrency } from "../utils/format.ts";
import { MarkdownSection } from "./components/markdown-section.tsx";
import { DetailActions } from "./components/detail-actions.tsx";
import { SseRefresh } from "./components/sse-refresh.tsx";
import { AuditMeta } from "./components/audit-meta.tsx";
import { InfoItem } from "./components/info-item.tsx";
import { badgeClass } from "../components/ui/status-badge.tsx";
import { QUOTE_STATUS_VARIANTS } from "../domains/quote/constants.tsx";
import { INVOICE_STATUS_VARIANTS } from "../domains/invoice/constants.tsx";
import { CUSTOMER_BILLING_MAX_ROWS } from "../domains/customer/constants.tsx";

// ---------------------------------------------------------------------------
// Billing section — quotes + invoices for this customer
// ---------------------------------------------------------------------------

type InvoiceWithDisplay = Invoice & { displayStatus: string };

const BillingSection: FC<{
  customerId: string;
  quotes: Quote[];
  invoices: InvoiceWithDisplay[];
}> = ({ customerId, quotes, invoices }) => {
  const totalQuoted = quotes.reduce((sum, q) => sum + q.total, 0);
  const totalInvoiced = invoices.reduce((sum, i) => sum + i.total, 0);
  const totalPaid = invoices.reduce((sum, i) => sum + i.paidAmount, 0);
  const outstanding = totalInvoiced - totalPaid;

  const recentQuotes = quotes.slice(0, CUSTOMER_BILLING_MAX_ROWS);
  const recentInvoices = invoices.slice(0, CUSTOMER_BILLING_MAX_ROWS);
  const hasBilling = quotes.length > 0 || invoices.length > 0;

  return (
    <section class="detail-section customer-detail__billing">
      <h2 class="section-heading">Billing</h2>

      {/* -- Summary stats ------------------------------------------------ */}
      <div class="customer-detail__billing-stats">
        <div class="customer-detail__stat">
          <span class="customer-detail__stat-label">Quoted</span>
          <span class="customer-detail__stat-value">
            {formatCurrency(totalQuoted) || "$0"}
          </span>
        </div>
        <div class="customer-detail__stat">
          <span class="customer-detail__stat-label">Invoiced</span>
          <span class="customer-detail__stat-value">
            {formatCurrency(totalInvoiced) || "$0"}
          </span>
        </div>
        <div class="customer-detail__stat">
          <span class="customer-detail__stat-label">Paid</span>
          <span class="customer-detail__stat-value customer-detail__stat-value--paid">
            {formatCurrency(totalPaid) || "$0"}
          </span>
        </div>
        {outstanding > 0 && (
          <div class="customer-detail__stat">
            <span class="customer-detail__stat-label">Outstanding</span>
            <span class="customer-detail__stat-value customer-detail__stat-value--due">
              {formatCurrency(outstanding) || "$0"}
            </span>
          </div>
        )}
      </div>

      {!hasBilling && (
        <p class="customer-detail__billing-empty">
          No quotes or invoices yet.
        </p>
      )}

      {/* -- Quotes table ------------------------------------------------- */}
      {recentQuotes.length > 0 && (
        <div class="customer-detail__billing-group">
          <h3 class="customer-detail__billing-subtitle">
            Quotes
            <span class="customer-detail__billing-count">
              ({quotes.length})
            </span>
          </h3>
          <table class="data-table data-table--compact">
            <thead>
              <tr>
                <th>Number</th>
                <th>Title</th>
                <th>Status</th>
                <th class="data-table__th--right">Total</th>
                <th>Expires</th>
              </tr>
            </thead>
            <tbody>
              {recentQuotes.map((q) => (
                <tr key={q.id}>
                  <td>
                    <a href={`/quotes/${q.id}`}>{q.number}</a>
                  </td>
                  <td>{q.title}</td>
                  <td>
                    <span class={badgeClass(QUOTE_STATUS_VARIANTS, q.status)}>
                      {q.status}
                    </span>
                  </td>
                  <td class="data-table__td--right">
                    {formatCurrency(q.total) || "$0"}
                  </td>
                  <td>{q.expiresAt ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {quotes.length > CUSTOMER_BILLING_MAX_ROWS && (
            <a
              class="customer-detail__view-all"
              href={`/quotes?customerId=${customerId}`}
            >
              View all {quotes.length} quotes
            </a>
          )}
        </div>
      )}

      {/* -- Invoices table ----------------------------------------------- */}
      {recentInvoices.length > 0 && (
        <div class="customer-detail__billing-group">
          <h3 class="customer-detail__billing-subtitle">
            Invoices
            <span class="customer-detail__billing-count">
              ({invoices.length})
            </span>
          </h3>
          <table class="data-table data-table--compact">
            <thead>
              <tr>
                <th>Number</th>
                <th>Title</th>
                <th>Status</th>
                <th class="data-table__th--right">Total</th>
                <th class="data-table__th--right">Paid</th>
                <th>Due</th>
              </tr>
            </thead>
            <tbody>
              {recentInvoices.map((inv) => (
                <tr key={inv.id}>
                  <td>
                    <a href={`/invoices/${inv.id}`}>{inv.number}</a>
                  </td>
                  <td>{inv.title}</td>
                  <td>
                    <span
                      class={badgeClass(
                        INVOICE_STATUS_VARIANTS,
                        inv.displayStatus,
                      )}
                    >
                      {inv.displayStatus}
                    </span>
                  </td>
                  <td class="data-table__td--right">
                    {formatCurrency(inv.total) || "$0"}
                  </td>
                  <td class="data-table__td--right">
                    {formatCurrency(inv.paidAmount) || "$0"}
                  </td>
                  <td>{inv.dueDate ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {invoices.length > CUSTOMER_BILLING_MAX_ROWS && (
            <a
              class="customer-detail__view-all"
              href={`/invoices?customerId=${customerId}`}
            >
              View all {invoices.length} invoices
            </a>
          )}
        </div>
      )}
    </section>
  );
};

// ---------------------------------------------------------------------------
// Main view
// ---------------------------------------------------------------------------

export const CustomerDetailView: FC<
  ViewProps & {
    item: Customer;
    quotes: Quote[];
    invoices: InvoiceWithDisplay[];
  }
> = (
  { item: customer, quotes, invoices, ...viewProps },
) => {
  const addr = customer.billingAddress;
  const hasContact = customer.email || customer.phone || customer.company;
  const hasAddress = addr &&
    (addr.street || addr.city || addr.state || addr.postalCode || addr.country);

  return (
    <MainLayout
      title={customer.name}
      {...viewProps}
      styles={["/css/views/customers.css"]}
    >
      <SseRefresh
        getUrl={"/customers/" + customer.id}
        trigger="sse:customer.updated"
        targetId="customer-detail-root"
      />
      <main id="customer-detail-root" class="detail-view customer-detail">
        <BackButton href="/customers" label="Back to Customers" />

        {/* -- Header ---------------------------------------------------- */}
        <header class="detail-section customer-detail__header">
          <div class="detail-title-row customer-detail__title-row">
            <h1 class="detail-title customer-detail__title">{customer.name}</h1>
          </div>
          <DetailActions
            entity="customers"
            id={customer.id}
            title={customer.name}
            formContainerId="customers-form-container"
          />
        </header>

        {/* -- Contact info ----------------------------------------------- */}
        {hasContact && (
          <div class="detail-section detail-info-row">
            {customer.email && (
              <InfoItem label="Email">{customer.email}</InfoItem>
            )}
            {customer.phone && (
              <InfoItem label="Phone">{customer.phone}</InfoItem>
            )}
            {customer.company && (
              <InfoItem label="Company">{customer.company}</InfoItem>
            )}
          </div>
        )}

        {/* -- Billing address -------------------------------------------- */}
        {hasAddress && (
          <section class="detail-section customer-detail__section">
            <h2 class="section-heading">Billing Address</h2>
            <address class="customer-detail__address">
              {addr.street && <span>{addr.street}</span>}
              <span>
                {[addr.city, addr.state, addr.postalCode]
                  .filter(Boolean)
                  .join(", ")}
              </span>
              {addr.country && <span>{addr.country}</span>}
            </address>
          </section>
        )}

        {/* -- Notes ------------------------------------------------------ */}
        <MarkdownSection title="Notes" markdown={customer.notes} />

        {/* -- Billing ---------------------------------------------------- */}
        <BillingSection
          customerId={customer.id}
          quotes={quotes}
          invoices={invoices}
        />

        {/* -- Meta ------------------------------------------------------- */}
        <div class="detail-section customer-detail__meta">
          <span>Created {formatDate(customer.createdAt)}</span>
          {customer.updatedAt && customer.updatedAt !== customer.createdAt && (
            <span>&middot; Updated {formatDate(customer.updatedAt)}</span>
          )}
        </div>
        <AuditMeta
          createdAt={customer.createdAt}
          updatedAt={customer.updatedAt}
          createdBy={customer.createdBy}
          updatedBy={customer.updatedBy}
        />
      </main>

      <div id="customers-form-container" />
    </MainLayout>
  );
};
