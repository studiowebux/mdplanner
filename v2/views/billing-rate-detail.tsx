import type { FC } from "hono/jsx";
import { MainLayout } from "../components/layout/main.tsx";
import { BackButton } from "./components/back-button.tsx";
import { Breadcrumb } from "../components/ui/breadcrumb.tsx";
import type { BillingRate } from "../types/billing-rate.types.ts";
import type { ViewProps } from "../types/app.ts";
import { MarkdownSection } from "./components/markdown-section.tsx";
import { DetailActions } from "./components/detail-actions.tsx";
import { ArchivedBanner } from "./components/archived-banner.tsx";
import { SseRefresh } from "./components/sse-refresh.tsx";
import { InfoItem } from "./components/info-item.tsx";
import { formatRate, UNIT_LABELS } from "../domains/billing-rate/constants.tsx";
import { AuditMeta } from "./components/audit-meta.tsx";
import { EditModeToggle } from "./components/edit-mode-toggle.tsx";

// ---------------------------------------------------------------------------
// Notes — read (markdown) or in-place editable (contenteditable + Save).
// ---------------------------------------------------------------------------

const NotesSection: FC<{ rate: BillingRate }> = ({ rate }) => (
  <section class="detail-section">
    <h2 class="section-heading">Notes</h2>
    <div
      class="inline-editable"
      contenteditable
      data-inline-edit
      data-inline-original={rate.notes ?? ""}
      data-inline-target="billing-rate-notes-value"
      data-inline-save-btn="billing-rate-notes-save"
    >
      {rate.notes ?? ""}
    </div>
    <input
      type="hidden"
      id="billing-rate-notes-value"
      name="notes"
      value={rate.notes ?? ""}
    />
    <div class="inline-editable__actions">
      <button
        type="button"
        id="billing-rate-notes-save"
        class="btn btn--primary btn--sm is-hidden"
        hx-put={`/billing-rates/${rate.id}/notes?editing=true`}
        hx-include="#billing-rate-notes-value"
        hx-target="#billing-rate-detail-root"
        hx-select="#billing-rate-detail-root"
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

export const BillingRateDetailView: FC<
  ViewProps & { item: BillingRate; editing?: boolean }
> = (
  { item: rate, editing = false, ...viewProps },
) => {
  return (
    <MainLayout
      title={rate.name}
      {...viewProps}
      styles={["/css/views/billing-rates.css"]}
      scripts={["/js/inline-edit.js"]}
    >
      <SseRefresh
        getUrl={"/billing-rates/" + rate.id +
          (editing ? "?editing=true" : "")}
        trigger="sse:billing-rate.updated"
        targetId="billing-rate-detail-root"
      />
      <main
        id="billing-rate-detail-root"
        class={`detail-view billing-rate-detail${
          editing ? " billing-rate-detail--editing" : ""
        }`}
      >
        <Breadcrumb
          items={[
            { label: "Billing Rates", href: "/billing-rates" },
            { label: rate.name },
          ]}
        />
        <BackButton href="/billing-rates" label="Back to Billing Rates" />

        {/* -- Header ---------------------------------------------------- */}
        <header class="detail-section detail-header billing-rate-detail__header">
          <div class="detail-title-row billing-rate-detail__title-row">
            <h1 class="detail-title billing-rate-detail__title">{rate.name}</h1>
            {rate.isDefault && <span class="badge badge--green">Default</span>}
          </div>
          <DetailActions
            entity="billing-rates"
            id={rate.id}
            title={rate.name}
            formContainerId="billing-rates-form-container"
            archived={rate.archived === true}
          >
            <EditModeToggle
              href={`/billing-rates/${rate.id}`}
              editing={editing}
            />
          </DetailActions>
        </header>

        <ArchivedBanner entity={rate} />

        {/* -- Rate info ------------------------------------------------- */}
        <div class="detail-section detail-info-row">
          <InfoItem label="Rate">
            <span class="billing-rate-detail__rate">
              {formatRate(rate.rate, rate.unit)}
            </span>
          </InfoItem>
          <InfoItem label="Unit">
            {UNIT_LABELS[rate.unit] ?? rate.unit}
          </InfoItem>
          {rate.currency && (
            <InfoItem label="Currency">{rate.currency}</InfoItem>
          )}
          {rate.assignee && (
            <InfoItem label="Assignee">{rate.assignee}</InfoItem>
          )}
        </div>

        {/* -- Notes ------------------------------------------------------ */}
        {editing
          ? <NotesSection rate={rate} />
          : <MarkdownSection title="Notes" markdown={rate.notes} />}

        {/* -- Meta ------------------------------------------------------- */}
        <AuditMeta
          createdAt={rate.createdAt}
          updatedAt={rate.updatedAt}
          createdBy={rate.createdBy}
          updatedBy={rate.updatedBy}
        />
      </main>

      <div id="billing-rates-form-container" />
    </MainLayout>
  );
};
