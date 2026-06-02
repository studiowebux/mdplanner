import type { FC } from "hono/jsx";
import { MainLayout } from "../components/layout/main.tsx";
import { BackButton } from "./components/back-button.tsx";
import { Breadcrumb } from "../components/ui/breadcrumb.tsx";
import type { Eisenhower } from "../types/eisenhower.types.ts";
import type { ViewProps } from "../types/app.ts";
import { formatDate } from "../utils/time.ts";
import { toKebab } from "../utils/slug.ts";
import { MarkdownSection } from "./components/markdown-section.tsx";
import { DetailActions } from "./components/detail-actions.tsx";
import { EditModeToggle } from "./components/edit-mode-toggle.tsx";
import { ArchivedBanner } from "./components/archived-banner.tsx";
import {
  EISENHOWER_QUADRANT_KEYS,
  EISENHOWER_QUADRANT_META,
  type EisenhowerQuadrantKey,
} from "../domains/eisenhower/constants.tsx";
import { SseRefresh } from "./components/sse-refresh.tsx";
import { InfoItem } from "./components/info-item.tsx";
import { AuditMeta } from "./components/audit-meta.tsx";

const NotesSection: FC<{ e: Eisenhower }> = ({ e }) => (
  <section class="detail-section">
    <h2 class="section-heading">Notes</h2>
    <div
      class="inline-editable"
      contenteditable
      data-inline-edit
      data-inline-original={e.notes ?? ""}
      data-inline-target="eisenhower-notes-value"
      data-inline-save-btn="eisenhower-notes-save"
    >
      {e.notes ?? ""}
    </div>
    <input
      type="hidden"
      id="eisenhower-notes-value"
      name="notes"
      value={e.notes ?? ""}
    />
    <div class="inline-editable__actions">
      <button
        type="button"
        id="eisenhower-notes-save"
        class="btn btn--primary btn--sm is-hidden"
        hx-put={`/eisenhower/${e.id}/notes?editing=true`}
        hx-include="#eisenhower-notes-value"
        hx-target="#eisenhower-detail-root"
        hx-select="#eisenhower-detail-root"
        hx-swap="outerHTML"
      >
        Save
      </button>
    </div>
  </section>
);

export const EisenhowerDetailView: FC<
  ViewProps & { item: Eisenhower; editing?: boolean }
> = ({ item: e, editing = false, ...viewProps }) => {
  const editSuffix = editing ? "?editing=true" : "";

  return (
    <MainLayout
      title={e.title}
      {...viewProps}
      styles={["/css/views/eisenhower.css"]}
      scripts={["/js/quadrant-edit.js", "/js/inline-edit.js"]}
    >
      <SseRefresh
        getUrl={`/eisenhower/${e.id}${editSuffix}`}
        trigger="sse:eisenhower.updated"
        targetId="eisenhower-detail-root"
      />
      <main
        id="eisenhower-detail-root"
        class={`detail-view eisenhower-detail${
          editing ? " eisenhower-detail--editing" : ""
        }`}
      >
        <Breadcrumb
          items={[
            { label: "Eisenhower Matrices", href: "/eisenhower" },
            { label: e.title },
          ]}
        />
        <BackButton href="/eisenhower" label="Back to Eisenhower Matrices" />

        {/* -- Header ---------------------------------------------------- */}
        <header class="detail-section detail-header eisenhower-detail__header">
          <div class="detail-title-row eisenhower-detail__title-row">
            <h1 class="detail-title eisenhower-detail__title">{e.title}</h1>
            <span class="badge eisenhower-date-badge">
              {formatDate(e.date)}
            </span>
          </div>
          <DetailActions
            entity="eisenhower"
            id={e.id}
            title={e.title}
            formContainerId="eisenhower-form-container"
            archived={e.archived === true}
          >
            <EditModeToggle href={`/eisenhower/${e.id}`} editing={editing} />
          </DetailActions>
        </header>

        <ArchivedBanner entity={e} />

        {/* -- Project --------------------------------------------------- */}
        {e.project && (
          <div class="detail-section detail-info-row">
            <InfoItem label="Project">
              <a href={`/portfolio/${toKebab(e.project)}`}>{e.project}</a>
            </InfoItem>
          </div>
        )}

        {/* -- Quadrant Grid --------------------------------------------- */}
        <div class="quadrant-grid">
          {EISENHOWER_QUADRANT_KEYS.map((key: EisenhowerQuadrantKey) => {
            const meta = EISENHOWER_QUADRANT_META[key];
            const items = e[key];
            return (
              <div
                key={key}
                class="quadrant-card"
                data-quadrant={meta.modifier}
              >
                <div class="quadrant-card__header">
                  <div>
                    <h2 class="quadrant-card__title">{meta.label}</h2>
                    <span class="eisenhower-quadrant__subtitle">
                      {meta.subtitle}
                    </span>
                  </div>
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
                                data-quadrant-edit={`/eisenhower/${e.id}/${key}/${idx}${editSuffix}`}
                                hx-put={`/eisenhower/${e.id}/${key}/${idx}${editSuffix}`}
                                hx-trigger="quadrant-save"
                                hx-target="#eisenhower-detail-root"
                                hx-select="#eisenhower-detail-root"
                                hx-swap="outerHTML"
                                hx-include="this"
                              />
                            )
                            : <span>{item}</span>}
                          {editing && (
                            <button
                              type="button"
                              class="quadrant-card__remove"
                              hx-delete={`/eisenhower/${e.id}/${key}/${idx}${editSuffix}`}
                              hx-confirm={`Remove "${item}"?`}
                              hx-target="#eisenhower-detail-root"
                              hx-select="#eisenhower-detail-root"
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
                      data-quadrant-add={`/eisenhower/${e.id}/${key}${editSuffix}`}
                      hx-post={`/eisenhower/${e.id}/${key}${editSuffix}`}
                      hx-trigger="quadrant-submit"
                      hx-target="#eisenhower-detail-root"
                      hx-select="#eisenhower-detail-root"
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
        {editing
          ? <NotesSection e={e} />
          : <MarkdownSection title="Notes" markdown={e.notes} />}

        <AuditMeta
          createdAt={e.createdAt}
          updatedAt={e.updatedAt}
          createdBy={e.createdBy}
          updatedBy={e.updatedBy}
        />
      </main>

      <div id="eisenhower-form-container" />
    </MainLayout>
  );
};
