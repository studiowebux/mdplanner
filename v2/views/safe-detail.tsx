import type { FC } from "hono/jsx";
import { MainLayout } from "../components/layout/main.tsx";
import { BackButton } from "./components/back-button.tsx";
import type { Safe } from "../types/safe.types.ts";
import type { ViewProps } from "../types/app.ts";
import { DetailActions } from "./components/detail-actions.tsx";
import { SseRefresh } from "./components/sse-refresh.tsx";
import { InfoItem } from "./components/info-item.tsx";
import { AuditMeta } from "./components/audit-meta.tsx";
import { badgeClass } from "../components/ui/status-badge.tsx";
import { SAFE_STATUS_VARIANTS } from "../domains/safe/constants.tsx";

export const SafeDetailView: FC<ViewProps & { item: Safe }> = (
  { item: safe, ...viewProps },
) => {
  return (
    <MainLayout
      title={safe.investor}
      {...viewProps}
      styles={["/css/views/safe.css"]}
    >
      <SseRefresh
        getUrl={"/safe/" + safe.id}
        trigger="sse:safe.updated"
        targetId="safe-detail-root"
      />
      <main id="safe-detail-root" class="detail-view safe-detail">
        <BackButton href="/safe" label="Back to SAFEs" />

        {/* -- Header ---------------------------------------------------- */}
        <header class="detail-section safe-detail__header">
          <div>
            <h1 class="detail-title">{safe.investor}</h1>
            <div class="safe-detail__badges">
              <span class={badgeClass(SAFE_STATUS_VARIANTS, safe.status)}>
                {safe.status}
              </span>
              <span class="badge badge--accent">{safe.type}</span>
            </div>
          </div>
          <DetailActions
            entity="safe"
            id={safe.id}
            title={safe.investor}
            formContainerId="safe-form-container"
          />
        </header>

        {/* -- Info row -------------------------------------------------- */}
        <div class="detail-section detail-info-row">
          <InfoItem label="Amount">${safe.amount.toLocaleString()}</InfoItem>
          <InfoItem label="Valuation Cap">
            ${safe.valuation_cap.toLocaleString()}
          </InfoItem>
          <InfoItem label="Discount">{safe.discount}%</InfoItem>
          <InfoItem label="Date">{safe.date}</InfoItem>
        </div>

        {/* -- Notes ----------------------------------------------------- */}
        {safe.notes && (
          <div class="detail-section">
            <h2 class="section-heading">Notes</h2>
            <p class="safe-detail__notes">{safe.notes}</p>
          </div>
        )}

        <AuditMeta
          createdAt={safe.createdAt}
          updatedAt={safe.updatedAt}
          createdBy={safe.createdBy}
          updatedBy={safe.updatedBy}
        />
      </main>

      <div id="safe-form-container" />
    </MainLayout>
  );
};
