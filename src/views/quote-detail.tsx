import type { FC } from "hono/jsx";
import { MainLayout } from "../components/layout/main.tsx";
import { BackButton } from "./components/back-button.tsx";
import { Breadcrumb } from "../components/ui/breadcrumb.tsx";
import type { Quote, QuoteRevision } from "../types/quote.types.ts";
import type { ViewProps } from "../types/app.ts";
import type { ProjectConfig } from "../types/project.types.ts";
import { formatDate } from "../utils/time.ts";
import { formatCurrency } from "../utils/format.ts";
import { MarkdownSection } from "./components/markdown-section.tsx";
import { DetailActions } from "./components/detail-actions.tsx";
import { SseRefresh } from "./components/sse-refresh.tsx";
import { InfoItem } from "./components/info-item.tsx";
import { LineItemsTable } from "./components/line-items-table.tsx";
import { BillingTotals } from "./components/billing-totals.tsx";
import { QuoteLineItemsSection } from "./components/quote-line-items-editor.tsx";
import { QUOTE_STATUS_VARIANTS } from "../domains/quote/constants.tsx";
import { badgeClass } from "../components/ui/status-badge.tsx";
import { AuditMeta } from "./components/audit-meta.tsx";
import { ArchivedBanner } from "./components/archived-banner.tsx";
import { BillingDocumentHeader } from "./components/billing-document-header.tsx";
import { EditModeToggle } from "./components/edit-mode-toggle.tsx";
import { InlineEditable } from "./components/inline-editable.tsx";

// ---------------------------------------------------------------------------
// Shared inline-editable section for `notes` and `footer`.
// ---------------------------------------------------------------------------

const InlineEditSection: FC<{
  quote: Quote;
  field: "notes" | "footer";
  title: string;
}> = ({ quote, field, title }) => {
  const value = (quote[field] ?? "") as string;
  return (
    <section class="detail-section">
      <h2 class="section-heading">{title}</h2>
      <InlineEditable
        fieldId={`quote-${field}`}
        name={field}
        value={value}
        hxPut={`/quotes/${quote.id}/${field}?editing=true`}
        rootId="quote-detail-root"
      />
    </section>
  );
};

// ---------------------------------------------------------------------------
// Header + status-driven action buttons
// ---------------------------------------------------------------------------

/** Status-transition buttons + print link for the quote header. */
const QuoteActions: FC<{ quote: Quote; editing: boolean }> = (
  { quote, editing },
) => (
  <div class="quote-detail__actions-row">
    <DetailActions
      entity="quotes"
      id={quote.id}
      title={quote.title}
      formContainerId="quotes-form-container"
      archived={quote.archived === true}
    >
      <EditModeToggle href={`/quotes/${quote.id}`} editing={editing} />
    </DetailActions>
    {quote.status === "draft" && (
      <button
        class="btn btn--primary btn--sm"
        type="button"
        hx-post={`/quotes/${quote.id}/submit-approval`}
        hx-confirm="Submit this quote for internal approval?"
        data-confirm-title="Submit for Approval"
        data-confirm-label="Submit"
        hx-swap="none"
      >
        Submit for Approval
      </button>
    )}
    {quote.status === "pending_approval" && (
      <>
        <button
          class="btn btn--success btn--sm"
          type="button"
          hx-post={`/quotes/${quote.id}/approve`}
          hx-confirm="Approve this quote?"
          data-confirm-title="Approve Quote"
          data-confirm-label="Approve"
          hx-swap="none"
        >
          Approve
        </button>
        <button
          class="btn btn--warning btn--sm"
          type="button"
          hx-post={`/quotes/${quote.id}/reject-approval`}
          hx-confirm="This quote will be returned to draft."
          data-confirm-title="Reject Quote"
          data-confirm-label="Reject"
          hx-swap="none"
        >
          Reject
        </button>
      </>
    )}
    {quote.status === "approved" && (
      <button
        class="btn btn--primary btn--sm"
        type="button"
        hx-post={`/quotes/${quote.id}/send`}
        hx-confirm="Send this quote to the customer?"
        data-confirm-title="Send Quote"
        data-confirm-label="Send"
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
          hx-post={`/quotes/${quote.id}/accept`}
          hx-confirm="Accept this quote?"
          data-confirm-title="Accept Quote"
          data-confirm-label="Accept"
          hx-swap="none"
        >
          Accept
        </button>
        <button
          class="btn btn--warning btn--sm"
          type="button"
          hx-post={`/quotes/${quote.id}/reject`}
          hx-confirm="This quote will be marked as rejected."
          data-confirm-title="Reject Quote"
          data-confirm-label="Reject"
          hx-swap="none"
        >
          Reject
        </button>
      </>
    )}
    <a
      class="btn btn--secondary btn--sm quote-detail__print-btn"
      href={`/quotes/${quote.id}/print`}
      target="_blank"
      rel="noopener"
    >
      Print / Save as PDF
    </a>
  </div>
);

/** Title row + status badge + actions. */
const QuoteHeader: FC<{ quote: Quote; editing: boolean }> = (
  { quote, editing },
) => (
  <header class="detail-section detail-header quote-detail__header">
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
    <QuoteActions quote={quote} editing={editing} />
  </header>
);

// ---------------------------------------------------------------------------
// Body sections
// ---------------------------------------------------------------------------

/** Customer / currency / expiry / revision info row. */
const QuoteInfoRow: FC<{ quote: Quote }> = ({ quote }) => (
  <div class="detail-section detail-info-row">
    <InfoItem label="Customer">
      <a href={`/customers/${quote.customerId}`}>{quote.customerId}</a>
    </InfoItem>
    {quote.currency && <InfoItem label="Currency">{quote.currency}</InfoItem>}
    {quote.expiresAt && <InfoItem label="Expires">{quote.expiresAt}</InfoItem>}
    {quote.revision && <InfoItem label="Revision">v{quote.revision}</InfoItem>}
  </div>
);

/** Editable line-item editor (draft) or read-only totals table. */
const QuoteLineItems: FC<{ quote: Quote }> = ({ quote }) =>
  quote.status === "draft"
    ? <QuoteLineItemsSection quote={quote} />
    : (
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
    );

/** Payment schedule table — hidden when no schedule is set. */
const PaymentScheduleSection: FC<{ quote: Quote }> = ({ quote }) => {
  if (!quote.paymentSchedule || quote.paymentSchedule.length === 0) return null;
  return (
    <section class="detail-section">
      <h2 class="section-heading">Payment Schedule</h2>
      <table class="data-table">
        <thead>
          <tr>
            <th scope="col">Description</th>
            <th scope="col">%</th>
            <th scope="col">Amount</th>
            <th scope="col">Due</th>
          </tr>
        </thead>
        <tbody>
          {quote.paymentSchedule.map((ps) => {
            const amt = ps.amount ??
              (ps.percent != null
                ? Math.round(quote.total * ps.percent / 100 * 100) / 100
                : null);
            return (
              <tr>
                <td>{ps.description}</td>
                <td>{ps.percent != null ? `${ps.percent}%` : ""}</td>
                <td>{amt != null ? formatCurrency(amt) : ""}</td>
                <td>{ps.dueDate ?? ""}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
};

/** Terms/footer — editable, configured default, or hidden. */
const FooterSection: FC<{
  quote: Quote;
  billingConfig: ProjectConfig;
  editing: boolean;
}> = ({ quote, billingConfig, editing }) => {
  if (editing) {
    return <InlineEditSection quote={quote} field="footer" title="Terms" />;
  }
  const footer = quote.footer || billingConfig.billingDefaultFooter;
  if (!footer) return null;
  return (
    <section class="detail-section quote-detail__footer">
      <h2 class="section-heading">Terms</h2>
      <p>{footer}</p>
    </section>
  );
};

/** Notes — editable form or rendered markdown. */
const NotesSection: FC<{ quote: Quote; editing: boolean }> = (
  { quote, editing },
) =>
  editing
    ? <InlineEditSection quote={quote} field="notes" title="Notes" />
    : <MarkdownSection title="Notes" markdown={quote.notes} />;

/** Internal approval trail — hidden until a quote enters the approval flow. */
const ApprovalSection: FC<{ quote: Quote }> = ({ quote }) => {
  if (
    !quote.submittedForApprovalAt && !quote.approvedBy && !quote.approvalNotes
  ) {
    return null;
  }
  return (
    <section class="detail-section quote-detail__approval">
      <h2 class="section-heading">Approval</h2>
      <div class="detail-info-row">
        {quote.submittedForApprovalAt && (
          <InfoItem label="Submitted">
            {formatDate(quote.submittedForApprovalAt)}
          </InfoItem>
        )}
        {quote.approvedBy && (
          <InfoItem label="Approved by">{quote.approvedBy}</InfoItem>
        )}
        {quote.approvedAt && (
          <InfoItem label="Approved">{formatDate(quote.approvedAt)}</InfoItem>
        )}
      </div>
      {quote.approvalNotes && (
        <p class="quote-detail__approval-notes">{quote.approvalNotes}</p>
      )}
    </section>
  );
};

/** Sent / accepted timestamps. */
const QuoteTimes: FC<{ quote: Quote }> = ({ quote }) => {
  if (!quote.sentAt && !quote.acceptedAt) return null;
  return (
    <div class="detail-section quote-detail__meta">
      {quote.sentAt && <span>Sent {formatDate(quote.sentAt)}</span>}
      {quote.acceptedAt && <span>Accepted {formatDate(quote.acceptedAt)}</span>}
    </div>
  );
};

/** Collapsible revision history table. */
const RevisionHistory: FC<{ revisions: QuoteRevision[] }> = ({ revisions }) => {
  if (revisions.length === 0) return null;
  return (
    <section class="detail-section quote-detail__revisions">
      <details>
        <summary class="quote-detail__revisions-summary">
          Revision History
          <span class="badge">{revisions.length}</span>
        </summary>
        <table class="data-table quote-detail__revisions-table">
          <thead>
            <tr>
              <th scope="col">Rev</th>
              <th scope="col">Sent</th>
              <th scope="col">Line Items</th>
              <th scope="col">Subtotal</th>
              <th scope="col">Total</th>
              <th scope="col">Sent By</th>
            </tr>
          </thead>
          <tbody>
            {[...revisions].reverse().map((rev) => (
              <tr>
                <td>v{rev.revisionNumber}</td>
                <td>{formatDate(rev.snapshotAt)}</td>
                <td>{rev.lineItemCount}</td>
                <td>{formatCurrency(rev.subtotal)}</td>
                <td>{formatCurrency(rev.total)}</td>
                <td>{rev.sentBy}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </section>
  );
};

// ---------------------------------------------------------------------------
// Main view
// ---------------------------------------------------------------------------

export const QuoteDetailView: FC<
  ViewProps & {
    item: Quote;
    billingConfig: ProjectConfig;
    revisions: QuoteRevision[];
    editing?: boolean;
  }
> = (
  { item: quote, billingConfig, revisions, editing = false, ...viewProps },
) => (
  <MainLayout
    title={`${quote.number} — ${quote.title}`}
    {...viewProps}
    styles={["/css/views/quotes.css", "/css/views/billing.css"]}
    scripts={["/js/inline-edit.js", "/js/quadrant-edit.js"]}
  >
    <SseRefresh
      getUrl={"/quotes/" + quote.id + (editing ? "?editing=true" : "")}
      trigger="sse:quote.updated"
      targetId="quote-detail-root"
    />
    <main
      id="quote-detail-root"
      class={`detail-view quote-detail${
        editing ? " quote-detail--editing" : ""
      }`}
    >
      <Breadcrumb
        items={[
          { label: "Quotes", href: "/quotes" },
          { label: quote.number },
        ]}
      />
      <BackButton href="/quotes" label="Back to Quotes" />

      <BillingDocumentHeader config={billingConfig} />
      <QuoteHeader quote={quote} editing={editing} />
      <ArchivedBanner entity={quote} />
      <QuoteInfoRow quote={quote} />
      <QuoteLineItems quote={quote} />
      <PaymentScheduleSection quote={quote} />
      <FooterSection
        quote={quote}
        billingConfig={billingConfig}
        editing={editing}
      />
      <NotesSection quote={quote} editing={editing} />
      <ApprovalSection quote={quote} />
      <QuoteTimes quote={quote} />
      <AuditMeta
        createdAt={quote.createdAt}
        updatedAt={quote.updatedAt}
        createdBy={quote.createdBy}
        updatedBy={quote.updatedBy}
      />
      <RevisionHistory revisions={revisions} />
    </main>

    <div id="quotes-form-container" />
  </MainLayout>
);
