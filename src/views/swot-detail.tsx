import type { FC } from "hono/jsx";
import { MainLayout } from "../components/layout/main.tsx";
import { BackButton } from "./components/back-button.tsx";
import { Breadcrumb } from "../components/ui/breadcrumb.tsx";
import type { Swot } from "../types/swot.types.ts";
import type { ViewProps } from "../types/app.ts";
import { formatDate } from "../utils/time.ts";
import { toKebab } from "../utils/slug.ts";
import { MarkdownSection } from "./components/markdown-section.tsx";
import { DetailActions } from "./components/detail-actions.tsx";
import {
  SWOT_QUADRANT_META,
  SWOT_QUADRANTS,
  type SwotQuadrantKey,
} from "../domains/swot/constants.tsx";
import { SseRefresh } from "./components/sse-refresh.tsx";
import { InfoItem } from "./components/info-item.tsx";
import { AuditMeta } from "./components/audit-meta.tsx";
import { ArchivedBanner } from "./components/archived-banner.tsx";
import { QuadrantEditGrid } from "./components/quadrant-edit-grid.tsx";
import { EditModeToggle } from "./components/edit-mode-toggle.tsx";

const NotesSection: FC<{ swot: Swot }> = ({ swot }) => (
  <section class="detail-section">
    <h2 class="section-heading">Notes</h2>
    <div
      class="inline-editable"
      contenteditable
      data-inline-edit
      data-inline-original={swot.notes ?? ""}
      data-inline-target="swot-notes-value"
      data-inline-save-btn="swot-notes-save"
    >
      {swot.notes ?? ""}
    </div>
    <input
      type="hidden"
      id="swot-notes-value"
      name="notes"
      value={swot.notes ?? ""}
    />
    <div class="inline-editable__actions">
      <button
        type="button"
        id="swot-notes-save"
        class="btn btn--primary btn--sm is-hidden"
        hx-put={`/swot/${swot.id}/notes?editing=true`}
        hx-include="#swot-notes-value"
        hx-target="#swot-detail-root"
        hx-select="#swot-detail-root"
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

export const SwotDetailView: FC<
  ViewProps & { item: Swot; editing?: boolean }
> = (
  { item: swot, editing = false, ...viewProps },
) => {
  const editSuffix = editing ? "?editing=true" : "";

  return (
    <MainLayout
      title={swot.title}
      {...viewProps}
      styles={["/css/views/swot.css"]}
      scripts={["/js/quadrant-edit.js", "/js/inline-edit.js"]}
    >
      <SseRefresh
        getUrl={"/swot/" + swot.id + editSuffix}
        trigger="sse:swot.updated"
        targetId="swot-detail-root"
      />
      <main
        id="swot-detail-root"
        class={`detail-view swot-detail${
          editing ? " swot-detail--editing" : ""
        }`}
      >
        <Breadcrumb
          items={[
            { label: "SWOT Analyses", href: "/swot" },
            { label: swot.title },
          ]}
        />
        <BackButton href="/swot" label="Back to SWOT Analyses" />

        {/* -- Header ---------------------------------------------------- */}
        <header class="detail-section detail-header swot-detail__header">
          <div class="detail-title-row swot-detail__title-row">
            <h1 class="detail-title swot-detail__title">{swot.title}</h1>
            <span class="badge swot-date-badge">{formatDate(swot.date)}</span>
          </div>
          <DetailActions
            entity="swot"
            id={swot.id}
            title={swot.title}
            formContainerId="swot-form-container"
            archived={swot.archived === true}
          >
            <EditModeToggle href={`/swot/${swot.id}`} editing={editing} />
          </DetailActions>
        </header>

        <ArchivedBanner entity={swot} />

        {/* -- Project --------------------------------------------------- */}
        {swot.project && (
          <div class="detail-section detail-info-row">
            <InfoItem label="Project">
              <a href={`/portfolio/${toKebab(swot.project)}`}>
                {swot.project}
              </a>
            </InfoItem>
          </div>
        )}

        {/* -- Quadrant Grid --------------------------------------------- */}
        <QuadrantEditGrid
          basePath="/swot"
          id={swot.id}
          rootId="swot-detail-root"
          editing={editing}
          sections={SWOT_QUADRANTS.map((name) => {
            const key = name.toLowerCase() as SwotQuadrantKey;
            const meta = SWOT_QUADRANT_META[key];
            return {
              key,
              label: meta.label,
              items: swot[key],
              dataQuadrant: meta.modifier,
              addPlaceholder: `Add ${meta.singular}...`,
            };
          })}
        />

        {/* -- Notes ----------------------------------------------------- */}
        {editing
          ? <NotesSection swot={swot} />
          : <MarkdownSection title="Notes" markdown={swot.notes} />}

        <AuditMeta
          createdAt={swot.createdAt}
          updatedAt={swot.updatedAt}
          createdBy={swot.createdBy}
          updatedBy={swot.updatedBy}
        />
      </main>

      <div id="swot-form-container" />
    </MainLayout>
  );
};
