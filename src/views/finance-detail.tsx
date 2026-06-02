import type { FC } from "hono/jsx";
import { MainLayout } from "../components/layout/main.tsx";
import { BackButton } from "./components/back-button.tsx";
import { Breadcrumb } from "../components/ui/breadcrumb.tsx";
import type { Finance } from "../types/finance.types.ts";
import { FINANCE_TYPE_LABELS } from "../types/finance.types.ts";
import type { ViewProps } from "../types/app.ts";
import { MarkdownSection } from "./components/markdown-section.tsx";
import { DetailActions } from "./components/detail-actions.tsx";
import { ArchivedBanner } from "./components/archived-banner.tsx";
import { SseRefresh } from "./components/sse-refresh.tsx";
import { AuditMeta } from "./components/audit-meta.tsx";
import { InfoItem } from "./components/info-item.tsx";
import { badgeClass } from "../components/ui/status-badge.tsx";
import { FINANCE_TYPE_VARIANTS } from "../domains/finance/constants.tsx";
import { formatCurrency } from "../utils/format.ts";
import { formatDate } from "../utils/time.ts";
import { EditModeToggle } from "./components/edit-mode-toggle.tsx";

const NotesSection: FC<{ finance: Finance }> = ({ finance }) => (
  <section class="detail-section">
    <h2 class="section-heading">Notes</h2>
    <div
      class="inline-editable"
      contenteditable
      data-inline-edit
      data-inline-original={finance.description ?? ""}
      data-inline-target="finance-description-value"
      data-inline-save-btn="finance-description-save"
    >
      {finance.description ?? ""}
    </div>
    <input
      type="hidden"
      id="finance-description-value"
      name="description"
      value={finance.description ?? ""}
    />
    <div class="inline-editable__actions">
      <button
        type="button"
        id="finance-description-save"
        class="btn btn--primary btn--sm is-hidden"
        hx-put={`/finances/${finance.id}/description?editing=true`}
        hx-include="#finance-description-value"
        hx-target="#finance-detail-root"
        hx-select="#finance-detail-root"
        hx-swap="outerHTML"
      >
        Save
      </button>
    </div>
  </section>
);

export const FinanceDetailView: FC<
  ViewProps & { item: Finance; editing?: boolean }
> = (
  { item: finance, editing = false, ...viewProps },
) => {
  const tags = finance.tags ?? [];

  return (
    <MainLayout
      title={finance.title}
      {...viewProps}
      styles={["/css/views/finances.css"]}
      scripts={["/js/inline-edit.js"]}
    >
      <SseRefresh
        getUrl={`/finances/${finance.id}${editing ? "?editing=true" : ""}`}
        trigger="sse:finance.updated"
        targetId="finance-detail-root"
      />
      <main
        id="finance-detail-root"
        class={`detail-view finance-detail${
          editing ? " finance-detail--editing" : ""
        }`}
      >
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
            archived={finance.archived === true}
          >
            <EditModeToggle
              href={`/finances/${finance.id}`}
              editing={editing}
            />
          </DetailActions>
        </header>

        <ArchivedBanner entity={finance} />

        <div class="detail-section detail-info-row">
          <InfoItem label="Amount">
            <strong class="finance-detail__amount">
              {formatCurrency(finance.amount, { decimals: 2 })}
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

        {editing
          ? <NotesSection finance={finance} />
          : <MarkdownSection title="Notes" markdown={finance.description} />}

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
