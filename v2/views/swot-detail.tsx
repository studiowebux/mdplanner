import type { FC } from "hono/jsx";
import { MainLayout } from "../components/layout/main.tsx";
import type { Swot } from "../types/swot.types.ts";
import type { ViewProps } from "../types/app.ts";
import { formatDate } from "../utils/time.ts";
import { markdownToHtml } from "../utils/markdown.ts";
import { toKebab } from "../utils/slug.ts";
import {
  SWOT_QUADRANT_META,
  SWOT_QUADRANTS,
  type SwotQuadrantKey,
} from "../domains/swot/constants.tsx";

// ---------------------------------------------------------------------------
// Main view
// ---------------------------------------------------------------------------

export const SwotDetailView: FC<ViewProps & { item: Swot }> = (
  { item: swot, ...viewProps },
) => {
  const notesHtml = markdownToHtml(swot.notes ?? "");

  return (
    <MainLayout
      title={swot.title}
      {...viewProps}
      styles={["/css/views/swot.css"]}
    >
      <div
        hx-ext="sse"
        sse-connect="/sse"
        hx-get={`/swot/${swot.id}`}
        hx-trigger="sse:swot.updated"
        hx-target="#swot-detail-root"
        hx-select="#swot-detail-root"
        hx-swap="outerHTML"
      />
      <main id="swot-detail-root" class="detail-view swot-detail">
        <div class="swot-detail__back">
          <a href="/swot" class="btn btn--secondary">Back to SWOT Analyses</a>
        </div>

        {/* -- Header ---------------------------------------------------- */}
        <header class="detail-section swot-detail__header">
          <div class="detail-title-row swot-detail__title-row">
            <h1 class="detail-title swot-detail__title">{swot.title}</h1>
            <span class="badge swot-date-badge">{formatDate(swot.date)}</span>
          </div>
          <div class="detail-actions">
            <button
              class="btn btn--secondary btn--sm"
              type="button"
              hx-get={`/swot/${swot.id}/edit`}
              hx-target="#swot-form-container"
              hx-swap="innerHTML"
            >
              Edit
            </button>
            <button
              class="btn btn--danger btn--sm"
              type="button"
              hx-delete={`/swot/${swot.id}`}
              hx-swap="none"
              hx-confirm-dialog={`Delete "${swot.title}"? This cannot be undone.`}
              data-confirm-name={swot.title}
            >
              Delete
            </button>
          </div>
        </header>

        {/* -- Project --------------------------------------------------- */}
        {swot.project && (
          <div class="detail-section swot-detail__info-row">
            <span class="swot-detail__info-label">Project</span>
            <a href={`/portfolio/${toKebab(swot.project)}`}>
              {swot.project}
            </a>
          </div>
        )}

        {/* -- Quadrant Grid --------------------------------------------- */}
        <div class="quadrant-grid">
          {SWOT_QUADRANTS.map((name) => {
            const key = name.toLowerCase() as SwotQuadrantKey;
            const meta = SWOT_QUADRANT_META[key];
            const items = swot[key];
            return (
              <div
                key={key}
                class="quadrant-card"
                data-quadrant={meta.modifier}
              >
                <div class="quadrant-card__header">
                  <h2 class="quadrant-card__title">{meta.label}</h2>
                  <span class="quadrant-card__count">{items.length}</span>
                </div>
                {items.length > 0
                  ? (
                    <ul class="quadrant-card__list">
                      {items.map((item, idx) => <li key={idx}>{item}</li>)}
                    </ul>
                  )
                  : <p class="quadrant-card__empty">No items yet</p>}
              </div>
            );
          })}
        </div>

        {/* -- Notes ----------------------------------------------------- */}
        {notesHtml && (
          <section class="detail-section swot-detail__section">
            <h2 class="section-heading">Notes</h2>
            <div
              class="markdown-body"
              dangerouslySetInnerHTML={{ __html: notesHtml }}
            />
          </section>
        )}

        {/* -- Meta ------------------------------------------------------ */}
        <div class="detail-section swot-detail__meta">
          <span>Created {formatDate(swot.created)}</span>
          {swot.updated && swot.updated !== swot.created && (
            <span>&middot; Updated {formatDate(swot.updated)}</span>
          )}
        </div>
      </main>

      <div id="swot-form-container" />
    </MainLayout>
  );
};
