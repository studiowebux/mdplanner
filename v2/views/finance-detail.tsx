import type { FC } from "hono/jsx";
import { MainLayout } from "../components/layout/main.tsx";
import { BackButton } from "./components/back-button.tsx";
import { Breadcrumb } from "../components/ui/breadcrumb.tsx";
import type { Finance } from "../types/finance.types.ts";
import { FINANCE_TYPE_LABELS } from "../types/finance.types.ts";
import type { ViewProps } from "../types/app.ts";
import { MarkdownSection } from "./components/markdown-section.tsx";
import { DetailActions } from "./components/detail-actions.tsx";
import { SseRefresh } from "./components/sse-refresh.tsx";
import { AuditMeta } from "./components/audit-meta.tsx";
import { InfoItem } from "./components/info-item.tsx";
import { badgeClass } from "../components/ui/status-badge.tsx";
import { FINANCE_TYPE_VARIANTS } from "../domains/finance/constants.tsx";
import { formatDate } from "../utils/time.ts";

export const FinanceDetailView: FC<ViewProps & { item: Finance }> = (
  { item: finance, ...viewProps },
) => {
  const tags = finance.tags ?? [];

  return (
    <MainLayout
      title={finance.title}
      {...viewProps}
      styles={["/css/views/finances.css"]}
    >
      <SseRefresh
        getUrl={`/finances/${finance.id}`}
        trigger="sse:finance.updated"
        targetId="finance-detail-root"
      />
      <main id="finance-detail-root" class="detail-view finance-detail">
        <Breadcrumb
          items={[
            { label: "Finances", href: "/finances" },
            { label: finance.title },
          ]}
        />
        <BackButton href="/finances" label="Back to Finances" />

        <header class="detail-section detail-header finance-detail__header">
          <div class="detail-title-row">
            <h1 class="detail-title">{finance.title}</h1>
            <span class={badgeClass(FINANCE_TYPE_VARIANTS, finance.type)}>
              {FINANCE_TYPE_LABELS[finance.type]}
            </span>
          </div>
          <DetailActions
            entity="finances"
            id={finance.id}
            title={finance.title}
            formContainerId="finances-form-container"
          />
        </header>

        <div class="detail-section detail-info-row">
          <InfoItem label="Amount">
            <strong class="finance-detail__amount">
              {finance.amount.toLocaleString()}
              {finance.currency ? ` ${finance.currency}` : ""}
            </strong>
          </InfoItem>
          {finance.date && (
            <InfoItem label="Date">{formatDate(finance.date)}</InfoItem>
          )}
        </div>

        {tags.length > 0 && (
          <section class="detail-section">
            <h2 class="section-heading">Tags</h2>
            <div class="finance-detail__tags">
              {tags.map((t) => (
                <span key={t} class="finance-detail__tag">{t}</span>
              ))}
            </div>
          </section>
        )}

        <MarkdownSection title="Notes" markdown={finance.description} />

        <AuditMeta
          createdAt={finance.createdAt}
          updatedAt={finance.updatedAt}
          createdBy={finance.createdBy}
          updatedBy={finance.updatedBy}
        />
      </main>

      <div id="finances-form-container" />
    </MainLayout>
  );
};
