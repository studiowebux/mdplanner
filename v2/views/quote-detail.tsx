import type { FC } from "hono/jsx";
import { MainLayout } from "../components/layout/main.tsx";
import { BackButton } from "./components/back-button.tsx";
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
import { BillingDocumentHeader } from "./components/billing-document-header.tsx";

// ---------------------------------------------------------------------------
// Main view
// ---------------------------------------------------------------------------

export const QuoteDetailView: FC<
  ViewProps & {
    item: Quote;
    billingConfig: ProjectConfig;
    revisions: QuoteRevision[];
  }
> = (
  { item: quote, billingConfig, revisions, ...viewProps },
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

        <BillingDocumentHeader config={billingConfig} />

        {/* -- Header ---------------------------------------------------- */}
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
        {quote.status === "draft"
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
          )}

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
                {quote.paymentSchedule!.map((ps) => {
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
        )}

        {/* -- Footer ---------------------------------------------------- */}
        {(quote.footer || billingConfig.billingDefaultFooter) && (
          <section class="detail-section quote-detail__footer">
            <h2 class="section-heading">Terms</h2>
            <p>{quote.footer || billingConfig.billingDefaultFooter}</p>
          </section>
        )}

        {/* -- Notes ------------------------------------------------------ */}
        <MarkdownSection title="Notes" markdown={quote.notes} />

        {/* -- Approval info --------------------------------------------- */}
        {(quote.submittedForApprovalAt || quote.approvedBy ||
          quote.approvalNotes) && (
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
                <InfoItem label="Approved">
                  {formatDate(quote.approvedAt)}
                </InfoItem>
              )}
            </div>
            {quote.approvalNotes && (
              <p class="quote-detail__approval-notes">{quote.approvalNotes}</p>
            )}
          </section>
        )}

        {/* -- Meta ------------------------------------------------------- */}
        {(quote.sentAt || quote.acceptedAt) && (
          <div class="detail-section quote-detail__meta">
            {quote.sentAt && <span>Sent {formatDate(quote.sentAt)}</span>}
            {quote.acceptedAt && (
              <span>Accepted {formatDate(quote.acceptedAt)}</span>
            )}
          </div>
        )}
        <AuditMeta
          createdAt={quote.createdAt}
          updatedAt={quote.updatedAt}
          createdBy={quote.createdBy}
          updatedBy={quote.updatedBy}
        />

        {/* -- Revision history ------------------------------------------ */}
        {revisions.length > 0 && (
          <section class="detail-section quote-detail__revisions">
            <details>
              <summary class="quote-detail__revisions-summary">
                Revision History
                <span class="badge">{revisions.length}</span>
              </summary>
              <table class="data-table quote-detail__revisions-table">
                <thead>
                  <tr>
                    <th>Rev</th>
                    <th>Sent</th>
                    <th>Line Items</th>
                    <th>Subtotal</th>
                    <th>Total</th>
                    <th>Sent By</th>
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
        )}
      </main>

      <div id="quotes-form-container" />
    </MainLayout>
  );
};
