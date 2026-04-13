import type { FC } from "hono/jsx";
import { MainLayout } from "../components/layout/main.tsx";
import { BackButton } from "./components/back-button.tsx";
import type { Moscow } from "../types/moscow.types.ts";
import type { ViewProps } from "../types/app.ts";
import { formatDate } from "../utils/time.ts";
import { toKebab } from "../utils/slug.ts";
import { MarkdownSection } from "./components/markdown-section.tsx";
import { DetailActions } from "./components/detail-actions.tsx";
import {
  MOSCOW_QUADRANT_KEYS,
  MOSCOW_QUADRANT_META,
} from "../domains/moscow/constants.tsx";
import { SseRefresh } from "./components/sse-refresh.tsx";
import { InfoItem } from "./components/info-item.tsx";
import { AuditMeta } from "./components/audit-meta.tsx";

// ---------------------------------------------------------------------------
// Main view
// ---------------------------------------------------------------------------

export const MoscowDetailView: FC<
  ViewProps & { item: Moscow; editing?: boolean }
> = (
  { item: moscow, editing = false, ...viewProps },
) => {
  const editSuffix = editing ? "?editing=true" : "";

  return (
    <MainLayout
      title={moscow.title}
      {...viewProps}
      styles={["/css/views/moscow.css"]}
      scripts={["/js/quadrant-edit.js"]}
    >
      <SseRefresh
        getUrl={"/moscow/" + moscow.id + editSuffix}
        trigger="sse:moscow.updated"
        targetId="moscow-detail-root"
      />
      <main
        id="moscow-detail-root"
        class={`detail-view moscow-detail${
          editing ? " moscow-detail--editing" : ""
        }`}
      >
        <BackButton href="/moscow" label="Back to MoSCoW Analyses" />

        {/* -- Header ---------------------------------------------------- */}
        <header class="detail-section moscow-detail__header">
          <div class="detail-title-row moscow-detail__title-row">
            <h1 class="detail-title moscow-detail__title">{moscow.title}</h1>
            <span class="badge moscow-date-badge">
              {formatDate(moscow.date)}
            </span>
          </div>
          <DetailActions
            entity="moscow"
            id={moscow.id}
            title={moscow.title}
            formContainerId="moscow-form-container"
          >
            {editing
              ? (
                <a
                  class="btn btn--secondary btn--sm"
                  href={`/moscow/${moscow.id}`}
                >
                  Done Editing
                </a>
              )
              : (
                <a
                  class="btn btn--secondary btn--sm"
                  href={`/moscow/${moscow.id}?editing=true`}
                >
                  Edit Items
                </a>
              )}
          </DetailActions>
        </header>

        {/* -- Project --------------------------------------------------- */}
        {moscow.project && (
          <div class="detail-section detail-info-row">
            <InfoItem label="Project">
              <a href={`/portfolio/${toKebab(moscow.project)}`}>
                {moscow.project}
              </a>
            </InfoItem>
          </div>
        )}

        {/* -- Quadrant Grid --------------------------------------------- */}
        <div class="quadrant-grid">
          {MOSCOW_QUADRANT_KEYS.map((key) => {
            const meta = MOSCOW_QUADRANT_META[key];
            const items = moscow[key];
            return (
              <div
                key={key}
                class="quadrant-card"
                data-quadrant={meta.modifier}
              >
                <div class="quadrant-card__header">
                  <h2 class="quadrant-card__title">{meta.label}</h2>
                  <span class="badge">{items.length}</span>
                </div>
                {items.length > 0
                  ? (
                    <ul class="quadrant-card__list">
                      {items.map((item, idx) => (
                        <li key={idx} class="quadrant-card__item">
                          {editing
                            ? (
                              <input
                                type="text"
                                class="quadrant-card__inline-edit"
                                name="text"
                                value={item}
                                data-quadrant-edit={`/moscow/${moscow.id}/${key}/${idx}${editSuffix}`}
                                hx-put={`/moscow/${moscow.id}/${key}/${idx}${editSuffix}`}
                                hx-trigger="quadrant-save"
                                hx-target="#moscow-detail-root"
                                hx-select="#moscow-detail-root"
                                hx-swap="outerHTML"
                                hx-include="this"
                              />
                            )
                            : <span>{item}</span>}
                          {editing && (
                            <button
                              type="button"
                              class="quadrant-card__remove"
                              hx-delete={`/moscow/${moscow.id}/${key}/${idx}${editSuffix}`}
                              hx-confirm={`Remove "${item}"?`}
                              hx-target="#moscow-detail-root"
                              hx-select="#moscow-detail-root"
                              hx-swap="outerHTML"
                              aria-label={`Remove "${item}"`}
                            >
                              &times;
                            </button>
                          )}
                        </li>
                      ))}
                    </ul>
                  )
                  : <p class="quadrant-card__empty">No items yet</p>}
                {editing && (
                  <div class="quadrant-card__add">
                    <input
                      type="text"
                      class="quadrant-card__input"
                      name="text"
                      placeholder={`Add ${meta.singular}...`}
                      data-quadrant-add={`/moscow/${moscow.id}/${key}${editSuffix}`}
                      hx-post={`/moscow/${moscow.id}/${key}${editSuffix}`}
                      hx-trigger="quadrant-submit"
                      hx-target="#moscow-detail-root"
                      hx-select="#moscow-detail-root"
                      hx-swap="outerHTML"
                      hx-include="this"
                      autocomplete="off"
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* -- Notes ----------------------------------------------------- */}
        <MarkdownSection title="Notes" markdown={moscow.notes} />

        {/* -- Meta ------------------------------------------------------ */}
        <div class="detail-section moscow-detail__meta">
          <span>Created {formatDate(moscow.createdAt)}</span>
          {moscow.updatedAt && moscow.updatedAt !== moscow.createdAt && (
            <span>&middot; Updated {formatDate(moscow.updatedAt)}</span>
          )}
        </div>
        <AuditMeta
          createdAt={moscow.createdAt}
          updatedAt={moscow.updatedAt}
          createdBy={moscow.createdBy}
          updatedBy={moscow.updatedBy}
        />
      </main>

      <div id="moscow-form-container" />
    </MainLayout>
  );
};
