import type { FC } from "hono/jsx";
import { MainLayout } from "../components/layout/main.tsx";
import { BackButton } from "./components/back-button.tsx";
import { Breadcrumb } from "../components/ui/breadcrumb.tsx";
import type { Customer } from "../types/customer.types.ts";
import type { Quote } from "../types/quote.types.ts";
import type { Invoice } from "../types/invoice.types.ts";
import type { Payment } from "../types/payment.types.ts";
import { PAYMENT_METHOD_VARIANTS } from "../domains/payment/constants.tsx";
import type { ViewProps } from "../types/app.ts";
import { formatCurrency } from "../utils/format.ts";
import { reconcileBilling } from "../utils/billing-reconciliation.ts";
import { MoneyStatValue } from "./components/money-stat-value.tsx";
import { MarkdownSection } from "./components/markdown-section.tsx";
import { DetailActions } from "./components/detail-actions.tsx";
import { ArchivedBanner } from "./components/archived-banner.tsx";
import { SseRefresh } from "./components/sse-refresh.tsx";
import { AuditMeta } from "./components/audit-meta.tsx";
import { InfoItem } from "./components/info-item.tsx";
import { badgeClass } from "../components/ui/status-badge.tsx";
import { QUOTE_STATUS_VARIANTS } from "../domains/quote/constants.tsx";
import { INVOICE_STATUS_VARIANTS } from "../domains/invoice/constants.tsx";
import { CUSTOMER_BILLING_MAX_ROWS } from "../domains/customer/constants.tsx";
import { EditModeToggle } from "./components/edit-mode-toggle.tsx";
import { InlineEditable } from "./components/inline-editable.tsx";

const NotesSection: FC<{ customer: Customer }> = ({ customer }) => (
  <section class="detail-section">
    <h2 class="section-heading">Notes</h2>
    <InlineEditable
      fieldId="customer-notes"
      name="notes"
      value={customer.notes ?? ""}
      hxPut={`/customers/${customer.id}/notes?editing=true`}
      rootId="customer-detail-root"
    />
  </section>
);

// ---------------------------------------------------------------------------
// Billing section — quotes + invoices for this customer
// ---------------------------------------------------------------------------

type InvoiceWithDisplay = Invoice & { displayStatus: string };

export const BillingSection: FC<{
  customerId: string;
  quotes: Quote[];
  invoices: InvoiceWithDisplay[];
  payments: Payment[];
  invoiceNumbers: Map<string, string>;
}> = ({ customerId, quotes, invoices, payments, invoiceNumbers }) => {
  const { quoted, invoiced, paid, outstanding } = reconcileBilling(
    quotes,
    invoices,
  );
  const hasOutstanding = outstanding.subtotals.some((s) => s.amount > 0);

  const recentQuotes = quotes.slice(0, CUSTOMER_BILLING_MAX_ROWS);
  const recentInvoices = invoices.slice(0, CUSTOMER_BILLING_MAX_ROWS);
  const recentPayments = payments.slice(0, CUSTOMER_BILLING_MAX_ROWS);
  const hasBilling = quotes.length > 0 || invoices.length > 0;

  return (
    <section class="detail-section customer-detail__billing">
      <h2 class="section-heading">Billing</h2>

      {/* -- Summary stats ------------------------------------------------ */}
      <div class="customer-detail__billing-stats">
        <div class="customer-detail__stat">
          <span class="customer-detail__stat-label">Quoted</span>
          <span class="customer-detail__stat-value">
            <MoneyStatValue totals={quoted} />
          </span>
        </div>
        <div class="customer-detail__stat">
          <span class="customer-detail__stat-label">Invoiced</span>
          <span class="customer-detail__stat-value">
            <MoneyStatValue totals={invoiced} />
          </span>
        </div>
        <div class="customer-detail__stat">
          <span class="customer-detail__stat-label">Paid</span>
          <span class="customer-detail__stat-value customer-detail__stat-value--paid">
            <MoneyStatValue totals={paid} />
          </span>
        </div>
        {hasOutstanding && (
          <div class="customer-detail__stat">
            <span class="customer-detail__stat-label">Outstanding</span>
            <span class="customer-detail__stat-value customer-detail__stat-value--due">
              <MoneyStatValue totals={outstanding} />
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
          <div class="data-table-wrapper">
            <table class="data-table data-table--compact">
              <thead class="data-table__head">
                <tr>
                  <th scope="col" class="data-table__th">Number</th>
                  <th scope="col" class="data-table__th">Title</th>
                  <th scope="col" class="data-table__th" data-col="status">
                    Status
                  </th>
                  <th scope="col" class="data-table__th data-table__th--right">
                    Total
                  </th>
                  <th scope="col" class="data-table__th">Expires</th>
                </tr>
              </thead>
              <tbody class="data-table__body">
                {recentQuotes.map((q) => (
                  <tr key={q.id} class="data-table__row">
                    <td class="data-table__td">
                      <a href={`/quotes/${q.id}`}>{q.number}</a>
                    </td>
                    <td class="data-table__td">{q.title}</td>
                    <td class="data-table__td" data-col="status">
                      <span class={badgeClass(QUOTE_STATUS_VARIANTS, q.status)}>
                        {q.status}
                      </span>
                    </td>
                    <td class="data-table__td data-table__td--right">
                      {formatCurrency(q.total) || "$0"}
                    </td>
                    <td class="data-table__td">{q.expiresAt ?? ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
          <div class="data-table-wrapper">
            <table class="data-table data-table--compact">
              <thead class="data-table__head">
                <tr>
                  <th scope="col" class="data-table__th">Number</th>
                  <th scope="col" class="data-table__th">Title</th>
                  <th scope="col" class="data-table__th" data-col="status">
                    Status
                  </th>
                  <th scope="col" class="data-table__th data-table__th--right">
                    Total
                  </th>
                  <th scope="col" class="data-table__th data-table__th--right">
                    Paid
                  </th>
                  <th scope="col" class="data-table__th">Due</th>
                </tr>
              </thead>
              <tbody class="data-table__body">
                {recentInvoices.map((inv) => (
                  <tr key={inv.id} class="data-table__row">
                    <td class="data-table__td">
                      <a href={`/invoices/${inv.id}`}>{inv.number}</a>
                    </td>
                    <td class="data-table__td">{inv.title}</td>
                    <td class="data-table__td" data-col="status">
                      <span
                        class={badgeClass(
                          INVOICE_STATUS_VARIANTS,
                          inv.displayStatus,
                        )}
                      >
                        {inv.displayStatus}
                      </span>
                    </td>
                    <td class="data-table__td data-table__td--right">
                      {formatCurrency(inv.total) || "$0"}
                    </td>
                    <td class="data-table__td data-table__td--right">
                      {formatCurrency(inv.paidAmount) || "$0"}
                    </td>
                    <td class="data-table__td">{inv.dueDate ?? ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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

      {/* -- Payments table ----------------------------------------------- */}
      {recentPayments.length > 0 && (
        <div class="customer-detail__billing-group">
          <h3 class="customer-detail__billing-subtitle">
            Payments
            <span class="customer-detail__billing-count">
              ({payments.length})
            </span>
          </h3>
          <div class="data-table-wrapper">
            <table class="data-table data-table--compact">
              <thead class="data-table__head">
                <tr>
                  <th scope="col" class="data-table__th">Date</th>
                  <th scope="col" class="data-table__th">Invoice</th>
                  <th scope="col" class="data-table__th data-table__th--right">
                    Amount
                  </th>
                  <th scope="col" class="data-table__th" data-col="status">
                    Method
                  </th>
                  <th scope="col" class="data-table__th">Reference</th>
                </tr>
              </thead>
              <tbody class="data-table__body">
                {recentPayments.map((p) => (
                  <tr key={p.id} class="data-table__row">
                    <td class="data-table__td">
                      <a href={`/payments/${p.id}`}>{p.date}</a>
                    </td>
                    <td class="data-table__td">
                      <a href={`/invoices/${p.invoiceId}`}>
                        {invoiceNumbers.get(p.invoiceId) ?? p.invoiceId}
                      </a>
                    </td>
                    <td class="data-table__td data-table__td--right">
                      {formatCurrency(p.amount) || "$0"}
                    </td>
                    <td class="data-table__td" data-col="status">
                      {p.method
                        ? (
                          <span
                            class={badgeClass(
                              PAYMENT_METHOD_VARIANTS,
                              p.method,
                            )}
                          >
                            {p.method}
                          </span>
                        )
                        : ""}
                    </td>
                    <td class="data-table__td">{p.reference ?? ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {payments.length > CUSTOMER_BILLING_MAX_ROWS && (
            <a class="customer-detail__view-all" href="/payments">
              View all {payments.length} payments
            </a>
          )}
        </div>
      )}
    </section>
  );
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

const CustomerContactInfo: FC<{ customer: Customer }> = ({ customer }) => {
  if (!customer.email && !customer.phone && !customer.company) return null;
  return (
    <div class="detail-section detail-info-row">
      {customer.email && (
        <InfoItem label="Email">
          <a href={`mailto:${customer.email}`}>{customer.email}</a>
        </InfoItem>
      )}
      {customer.phone && (
        <InfoItem label="Phone">
          <a href={`tel:${customer.phone}`}>{customer.phone}</a>
        </InfoItem>
      )}
      {customer.company && (
        <InfoItem label="Company">
          <a href={`/companies?q=${encodeURIComponent(customer.company)}`}>
            {customer.company}
          </a>
        </InfoItem>
      )}
    </div>
  );
};

const CustomerAddress: FC<{ customer: Customer }> = ({ customer }) => {
  const addr = customer.billingAddress;
  if (
    !addr ||
    (!addr.street && !addr.city && !addr.state && !addr.postalCode &&
      !addr.country)
  ) return null;
  return (
    <section class="detail-section customer-detail__section">
      <h2 class="section-heading">Billing Address</h2>
      <address class="customer-detail__address">
        {addr.street && <span>{addr.street}</span>}
        <span>
          {[addr.city, addr.state, addr.postalCode].filter(Boolean).join(", ")}
        </span>
        {addr.country && <span>{addr.country}</span>}
      </address>
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
    payments: Payment[];
    invoiceNumbers: Map<string, string>;
    editing?: boolean;
  }
> = (
  {
    item: customer,
    quotes,
    invoices,
    payments,
    invoiceNumbers,
    editing = false,
    ...viewProps
  },
) => {
  return (
    <MainLayout
      title={customer.name}
      {...viewProps}
      styles={["/css/views/customers.css"]}
      scripts={["/js/inline-edit.js"]}
    >
      <SseRefresh
        getUrl={"/customers/" + customer.id + (editing ? "?editing=true" : "")}
        trigger="sse:customer.updated"
        targetId="customer-detail-root"
      />
      <main
        id="customer-detail-root"
        class={`detail-view customer-detail${
          editing ? " customer-detail--editing" : ""
        }`}
      >
        <Breadcrumb
          items={[
            { label: "Customers", href: "/customers" },
            { label: customer.name },
          ]}
        />
        <BackButton href="/customers" label="Back to Customers" />

        {/* -- Header ---------------------------------------------------- */}
        <header class="detail-section detail-header customer-detail__header">
          <div class="detail-title-row customer-detail__title-row">
            <h1 class="detail-title customer-detail__title">{customer.name}</h1>
          </div>
          <DetailActions
            entity="customers"
            id={customer.id}
            title={customer.name}
            formContainerId="customers-form-container"
            archived={customer.archived === true}
          >
            <EditModeToggle
              href={`/customers/${customer.id}`}
              editing={editing}
            />
          </DetailActions>
        </header>

        <ArchivedBanner entity={customer} />
        <CustomerContactInfo customer={customer} />
        <CustomerAddress customer={customer} />

        {/* -- Notes ------------------------------------------------------ */}
        {editing
          ? <NotesSection customer={customer} />
          : <MarkdownSection title="Notes" markdown={customer.notes} />}

        {/* -- Billing ---------------------------------------------------- */}
        <BillingSection
          customerId={customer.id}
          quotes={quotes}
          invoices={invoices}
          payments={payments}
          invoiceNumbers={invoiceNumbers}
        />

        {/* -- Meta ------------------------------------------------------- */}
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
