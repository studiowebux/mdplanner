import type { FC } from "hono/jsx";
import { MainLayout } from "../components/layout/main.tsx";
import { BackButton } from "./components/back-button.tsx";
import type { BillingRate } from "../types/billing-rate.types.ts";
import type { ViewProps } from "../types/app.ts";
import { formatDate } from "../utils/time.ts";
import { MarkdownSection } from "./components/markdown-section.tsx";
import { DetailActions } from "./components/detail-actions.tsx";
import { SseRefresh } from "./components/sse-refresh.tsx";
import { InfoItem } from "./components/info-item.tsx";
import { formatRate, UNIT_LABELS } from "../domains/billing-rate/constants.tsx";
import { AuditMeta } from "./components/audit-meta.tsx";

// ---------------------------------------------------------------------------
// Main view
// ---------------------------------------------------------------------------

export const BillingRateDetailView: FC<
  ViewProps & { item: BillingRate }
> = (
  { item: rate, ...viewProps },
) => {
  return (
    <MainLayout
      title={rate.name}
      {...viewProps}
      styles={["/css/views/billing-rates.css"]}
    >
      <SseRefresh
        getUrl={"/billing-rates/" + rate.id}
        trigger="sse:billing-rate.updated"
        targetId="billing-rate-detail-root"
      />
      <main
        id="billing-rate-detail-root"
        class="detail-view billing-rate-detail"
      >
        <BackButton href="/billing-rates" label="Back to Billing Rates" />

        {/* -- Header ---------------------------------------------------- */}
        <header class="detail-section billing-rate-detail__header">
          <div class="detail-title-row billing-rate-detail__title-row">
            <h1 class="detail-title billing-rate-detail__title">{rate.name}</h1>
            {rate.isDefault && <span class="badge badge--green">Default</span>}
          </div>
          <DetailActions
            entity="billing-rates"
            id={rate.id}
            title={rate.name}
            formContainerId="billing-rates-form-container"
          />
        </header>

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
        <MarkdownSection title="Notes" markdown={rate.notes} />

        {/* -- Meta ------------------------------------------------------- */}
        <div class="detail-section billing-rate-detail__meta">
          <span>Created {formatDate(rate.createdAt)}</span>
          {rate.updatedAt && rate.updatedAt !== rate.createdAt && (
            <span>&middot; Updated {formatDate(rate.updatedAt)}</span>
          )}
        </div>
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
