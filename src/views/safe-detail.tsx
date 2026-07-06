import type { FC } from "hono/jsx";
import { MainLayout } from "../components/layout/main.tsx";
import { BackButton } from "./components/back-button.tsx";
import { Breadcrumb } from "../components/ui/breadcrumb.tsx";
import type { Safe } from "../types/safe.types.ts";
import type { ViewProps } from "../types/app.ts";
import { DetailActions } from "./components/detail-actions.tsx";
import { SseRefresh } from "./components/sse-refresh.tsx";
import { InfoItem } from "./components/info-item.tsx";
import { AuditMeta } from "./components/audit-meta.tsx";
import { ArchivedBanner } from "./components/archived-banner.tsx";
import { badgeClass } from "../components/ui/status-badge.tsx";
import { SAFE_STATUS_VARIANTS } from "../domains/safe/constants.tsx";
import { MarkdownSection } from "./components/markdown-section.tsx";
import { EditModeToggle } from "./components/edit-mode-toggle.tsx";
import { InlineEditable } from "./components/inline-editable.tsx";

const NotesSection: FC<{ safe: Safe }> = ({ safe }) => (
  <section class="detail-section">
    <h2 class="section-heading">Notes</h2>
    <InlineEditable
      fieldId="safe-notes"
      name="notes"
      value={safe.notes ?? ""}
      hxPut={`/safe/${safe.id}/notes?editing=true`}
      rootId="safe-detail-root"
    />
  </section>
);

export const SafeDetailView: FC<
  ViewProps & { item: Safe; editing?: boolean }
> = (
  { item: safe, editing = false, ...viewProps },
) => {
  return (
    <MainLayout
      title={safe.investor}
      {...viewProps}
      styles={["/css/views/safe.css"]}
      scripts={["/js/inline-edit.js"]}
    >
      <SseRefresh
        getUrl={"/safe/" + safe.id + (editing ? "?editing=true" : "")}
        trigger="sse:safe.updated"
        targetId="safe-detail-root"
      />
      <main
        id="safe-detail-root"
        class={`detail-view safe-detail${
          editing ? " safe-detail--editing" : ""
        }`}
      >
        <Breadcrumb
          items={[
            { label: "SAFEs", href: "/safe" },
            { label: safe.investor },
          ]}
        />
        <BackButton href="/safe" label="Back to SAFEs" />

        {/* -- Header ---------------------------------------------------- */}
        <header class="detail-section detail-header safe-detail__header">
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
            archived={safe.archived === true}
          >
            <EditModeToggle href={`/safe/${safe.id}`} editing={editing} />
          </DetailActions>
        </header>

        <ArchivedBanner entity={safe} />

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
        {editing
          ? <NotesSection safe={safe} />
          : <MarkdownSection title="Notes" markdown={safe.notes} />}

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
