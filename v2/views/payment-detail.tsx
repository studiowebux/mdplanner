import type { FC } from "hono/jsx";
import { MainLayout } from "../components/layout/main.tsx";
import { BackButton } from "./components/back-button.tsx";
import { Breadcrumb } from "../components/ui/breadcrumb.tsx";
import type { Payment } from "../types/payment.types.ts";
import type { ViewProps } from "../types/app.ts";
import { formatCurrency } from "../utils/format.ts";
import { MarkdownSection } from "./components/markdown-section.tsx";
import { DetailActions } from "./components/detail-actions.tsx";
import { ArchivedBanner } from "./components/archived-banner.tsx";
import { SseRefresh } from "./components/sse-refresh.tsx";
import { InfoItem } from "./components/info-item.tsx";
import { PAYMENT_METHOD_VARIANTS } from "../domains/payment/constants.tsx";
import { badgeClass } from "../components/ui/status-badge.tsx";
import { AuditMeta } from "./components/audit-meta.tsx";
import { EditModeToggle } from "./components/edit-mode-toggle.tsx";

const NotesSection: FC<{ payment: Payment }> = ({ payment }) => (
  <section class="detail-section">
    <h2 class="section-heading">Notes</h2>
    <div
      class="inline-editable"
      contenteditable
      data-inline-edit
      data-inline-original={payment.notes ?? ""}
      data-inline-target="payment-notes-value"
      data-inline-save-btn="payment-notes-save"
    >
      {payment.notes ?? ""}
    </div>
    <input
      type="hidden"
      id="payment-notes-value"
      name="notes"
      value={payment.notes ?? ""}
    />
    <div class="inline-editable__actions">
      <button
        type="button"
        id="payment-notes-save"
        class="btn btn--primary btn--sm is-hidden"
        hx-put={`/payments/${payment.id}/notes?editing=true`}
        hx-include="#payment-notes-value"
        hx-target="#payment-detail-root"
        hx-select="#payment-detail-root"
        hx-swap="outerHTML"
      >
        Save
      </button>
    </div>
  </section>
);

// ---------------------------------------------------------------------------
// Main view
// ---------------------------------------------------------------------------

export const PaymentDetailView: FC<
  ViewProps & { item: Payment; editing?: boolean }
> = (
  { item: payment, editing = false, ...viewProps },
) => {
  return (
    <MainLayout
      title={`Payment — ${payment.reference ?? payment.id}`}
      {...viewProps}
      styles={["/css/views/payments.css"]}
      scripts={["/js/inline-edit.js"]}
    >
      <SseRefresh
        getUrl={"/payments/" + payment.id + (editing ? "?editing=true" : "")}
        trigger="sse:payment.updated"
        targetId="payment-detail-root"
      />
      <main
        id="payment-detail-root"
        class={`detail-view payment-detail${
          editing ? " payment-detail--editing" : ""
        }`}
      >
        <Breadcrumb
          items={[
            { label: "Payments", href: "/payments" },
            { label: payment.reference ?? payment.id },
          ]}
        />
        <BackButton href="/payments" label="Back to Payments" />

        {/* -- Header ---------------------------------------------------- */}
        <header class="detail-section detail-header payment-detail__header">
          <div class="detail-title-row payment-detail__title-row">
            <h1 class="detail-title payment-detail__title">
              {payment.reference ?? payment.id}
            </h1>
          </div>
          <DetailActions
            entity="payments"
            id={payment.id}
            title={payment.reference ?? payment.id}
            formContainerId="payments-form-container"
            archived={payment.archived === true}
          >
            <EditModeToggle
              href={`/payments/${payment.id}`}
              editing={editing}
            />
          </DetailActions>
        </header>

        <ArchivedBanner entity={payment} />

        {/* -- Amount ---------------------------------------------------- */}
        <div class="detail-section payment-detail__amount-section">
          <span class="payment-detail__amount">
            {formatCurrency(payment.amount) || "$0"}
          </span>
        </div>

        {/* -- Info ------------------------------------------------------- */}
        <div class="detail-section detail-info-row">
          <InfoItem label="Date">{payment.date}</InfoItem>
          <InfoItem label="Invoice">
            <a href={`/invoices/${payment.invoiceId}`}>
              {payment.invoiceId}
            </a>
          </InfoItem>
          {payment.method && (
            <InfoItem label="Method">
              <span class={badgeClass(PAYMENT_METHOD_VARIANTS, payment.method)}>
                {payment.method}
              </span>
            </InfoItem>
          )}
          {payment.reference && (
            <InfoItem label="Reference">{payment.reference}</InfoItem>
          )}
        </div>

        {/* -- Notes ------------------------------------------------------ */}
        {editing
          ? <NotesSection payment={payment} />
          : <MarkdownSection title="Notes" markdown={payment.notes} />}

        {/* -- Meta ------------------------------------------------------- */}
        <AuditMeta
          createdAt={payment.createdAt}
          updatedAt={payment.updatedAt}
          createdBy={payment.createdBy}
          updatedBy={payment.updatedBy}
        />
      </main>

      <div id="payments-form-container" />
    </MainLayout>
  );
};
