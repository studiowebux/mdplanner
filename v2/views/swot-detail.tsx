import type { FC } from "hono/jsx";
import { MainLayout } from "../components/layout/main.tsx";
import { BackButton } from "./components/back-button.tsx";
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
import { QuadrantEditGrid } from "./components/quadrant-edit-grid.tsx";

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
      scripts={["/js/quadrant-edit.js", "/js/fullscreen-reading.js"]}
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
          >
            <button
              type="button"
              class="btn btn--secondary btn--sm"
              data-fullscreen-toggle
            >
              Focus
            </button>
            {editing
              ? (
                <a
                  class="btn btn--secondary btn--sm"
                  href={`/swot/${swot.id}`}
                >
                  Done Editing
                </a>
              )
              : (
                <a
                  class="btn btn--secondary btn--sm"
                  href={`/swot/${swot.id}?editing=true`}
                >
                  Edit Items
                </a>
              )}
          </DetailActions>
        </header>

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
        <MarkdownSection title="Notes" markdown={swot.notes} />

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
