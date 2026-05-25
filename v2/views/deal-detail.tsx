import type { FC } from "hono/jsx";
import { MainLayout } from "../components/layout/main.tsx";
import { BackButton } from "./components/back-button.tsx";
import { Breadcrumb } from "../components/ui/breadcrumb.tsx";
import type { Deal } from "../types/deal.types.ts";
import { DEAL_STAGE_LABELS } from "../types/deal.types.ts";
import type { ViewProps } from "../types/app.ts";
import { MarkdownSection } from "./components/markdown-section.tsx";
import { DetailActions } from "./components/detail-actions.tsx";
import { ArchivedBanner } from "./components/archived-banner.tsx";
import { SseRefresh } from "./components/sse-refresh.tsx";
import { AuditMeta } from "./components/audit-meta.tsx";
import { InfoItem } from "./components/info-item.tsx";
import { badgeClass } from "../components/ui/status-badge.tsx";
import { DEAL_STAGE_VARIANTS } from "../domains/deal/constants.tsx";
import { formatDate } from "../utils/time.ts";

export const DealDetailView: FC<ViewProps & { item: Deal }> = (
  { item: deal, ...viewProps },
) => {
  const tags = deal.tags ?? [];

  return (
    <MainLayout
      title={deal.title}
      {...viewProps}
      styles={["/css/views/deals.css"]}
    >
      <SseRefresh
        getUrl={`/deals/${deal.id}`}
        trigger="sse:deal.updated"
        targetId="deal-detail-root"
      />
      <main id="deal-detail-root" class="detail-view deal-detail">
        <Breadcrumb
          items={[
            { label: "Deals", href: "/deals" },
            { label: deal.title },
          ]}
        />
        <BackButton href="/deals" label="Back to Deals" />

        <header class="detail-section detail-header deal-detail__header">
          <div class="detail-title-row">
            <h1 class="detail-title">{deal.title}</h1>
            <span class={badgeClass(DEAL_STAGE_VARIANTS, deal.stage)}>
              {DEAL_STAGE_LABELS[deal.stage]}
            </span>
          </div>
          <DetailActions
            entity="deals"
            id={deal.id}
            title={deal.title}
            formContainerId="deals-form-container"
            archived={deal.archived === true}
          />
        </header>

        <ArchivedBanner entity={deal} />

        <div class="detail-section detail-info-row">
          {deal.value != null && (
            <InfoItem label="Value">
              <strong class="deal-detail__value">
                {deal.value.toLocaleString()}
                {deal.currency ? ` ${deal.currency}` : ""}
              </strong>
            </InfoItem>
          )}
          {deal.company && (
            <InfoItem label="Company">
              <a href={`/companies?q=${encodeURIComponent(deal.company)}`}>
                {deal.company}
              </a>
            </InfoItem>
          )}
          {deal.contact && <InfoItem label="Contact">{deal.contact}</InfoItem>}
          {deal.assignee && (
            <InfoItem label="Assignee">{deal.assignee}</InfoItem>
          )}
          {deal.closedAt && (
            <InfoItem label="Closed">{formatDate(deal.closedAt)}</InfoItem>
          )}
        </div>

        {tags.length > 0 && (
          <section class="detail-section">
            <h2 class="section-heading">Tags</h2>
            <div class="deal-detail__tags">
              {tags.map((t) => (
                <span key={t} class="deal-detail__tag">{t}</span>
              ))}
            </div>
          </section>
        )}

        <MarkdownSection title="Description" markdown={deal.description} />

        <AuditMeta
          createdAt={deal.createdAt}
          updatedAt={deal.updatedAt}
          createdBy={deal.createdBy}
          updatedBy={deal.updatedBy}
        />
      </main>

      <div id="deals-form-container" />
    </MainLayout>
  );
};
