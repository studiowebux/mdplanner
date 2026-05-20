import type { FC } from "hono/jsx";
import { MainLayout } from "../components/layout/main.tsx";
import { BackButton } from "./components/back-button.tsx";
import type { BusinessModel } from "../types/business-model.types.ts";
import {
  BUSINESS_MODEL_SECTION_KEYS,
  type BusinessModelSectionKey,
} from "../types/business-model.types.ts";
import type { ViewProps } from "../types/app.ts";
import { formatDate } from "../utils/time.ts";
import { toKebab } from "../utils/slug.ts";
import { MarkdownSection } from "./components/markdown-section.tsx";
import { DetailActions } from "./components/detail-actions.tsx";
import { BUSINESS_MODEL_SECTION_META } from "../domains/business-model/constants.tsx";
import { SseRefresh } from "./components/sse-refresh.tsx";
import { InfoItem } from "./components/info-item.tsx";
import { AuditMeta } from "./components/audit-meta.tsx";

// ---------------------------------------------------------------------------
// Section block
// ---------------------------------------------------------------------------

const SectionBlock: FC<{
  id: string;
  sectionKey: BusinessModelSectionKey;
  label: string;
  items: string[];
  editing: boolean;
  editSuffix: string;
}> = ({ id, sectionKey, label, items, editing, editSuffix }) => (
  <div class="lc-section">
    <h3 class="lc-section__title">{label}</h3>
    {items.length === 0 && !editing
      ? <p class="lc-section__empty">Add items…</p>
      : (
        <ul class="lc-section__list">
          {items.map((item, idx) =>
            editing
              ? (
                <li key={idx} class="quadrant-card__item">
                  <textarea
                    class="quadrant-card__inline-edit quadrant-card__textarea"
                    name="text"
                    hx-put={`/business-models/${id}/${sectionKey}/${idx}${editSuffix}`}
                    hx-trigger="change"
                    hx-swap="none"
                    hx-include="this"
                  >
                    {item}
                  </textarea>
                  <button
                    type="button"
                    class="quadrant-card__remove"
                    hx-delete={`/business-models/${id}/${sectionKey}/${idx}${editSuffix}`}
                    hx-confirm={`Remove "${item}"?`}
                    hx-target="#bmc-detail-root"
                    hx-select="#bmc-detail-root"
                    hx-swap="outerHTML"
                    aria-label={`Remove "${item}"`}
                  >
                    &times;
                  </button>
                </li>
              )
              : <li key={idx}>{item}</li>
          )}
        </ul>
      )}
    {editing && (
      <form
        class="quadrant-card__add"
        hx-post={`/business-models/${id}/${sectionKey}${editSuffix}`}
        hx-target="#bmc-detail-root"
        hx-select="#bmc-detail-root"
        hx-swap="outerHTML"
      >
        <input
          type="text"
          class="quadrant-card__input quadrant-card__input--ghost"
          name="text"
          placeholder={`Add ${label.toLowerCase()}…`}
          autocomplete="off"
        />
      </form>
    )}
  </div>
);

// ---------------------------------------------------------------------------
// Main view
// ---------------------------------------------------------------------------

export const BusinessModelDetailView: FC<
  ViewProps & { item: BusinessModel; editing?: boolean }
> = ({ item: bmc, editing = false, ...viewProps }) => {
  const editSuffix = editing ? "?editing=true" : "";

  return (
    <MainLayout
      title={bmc.title}
      {...viewProps}
      styles={["/css/views/lean-canvases.css", "/css/views/business-model.css"]}
    >
      <SseRefresh
        getUrl={"/business-models/" + bmc.id + editSuffix}
        trigger="sse:business-model.updated"
        targetId="bmc-detail-root"
      />
      <main
        id="bmc-detail-root"
        class={`detail-view bmc-detail${editing ? " bmc-detail--editing" : ""}`}
      >
        <BackButton href="/business-models" label="Back to Business Models" />

        {/* -- Header ------------------------------------------------------- */}
        <header class="detail-section detail-header bmc-detail__header">
          <div class="detail-title-row">
            <h1 class="detail-title">{bmc.title}</h1>
            <span class="badge badge--neutral">{formatDate(bmc.date)}</span>
          </div>
          <DetailActions
            entity="business-models"
            id={bmc.id}
            title={bmc.title}
            formContainerId="business-models-form-container"
          >
            {editing
              ? (
                <a
                  class="btn btn--secondary btn--sm"
                  href={`/business-models/${bmc.id}`}
                >
                  Done Editing
                </a>
              )
              : (
                <a
                  class="btn btn--secondary btn--sm"
                  href={`/business-models/${bmc.id}?editing=true`}
                >
                  Edit Items
                </a>
              )}
          </DetailActions>
        </header>

        {/* -- Project ------------------------------------------------------- */}
        {bmc.project && (
          <div class="detail-section detail-info-row">
            <InfoItem label="Project">
              <a href={`/portfolio/${toKebab(bmc.project)}`}>{bmc.project}</a>
            </InfoItem>
          </div>
        )}

        {/* -- Canvas grid --------------------------------------------------- */}
        <div class="bmc-canvas">
          {BUSINESS_MODEL_SECTION_KEYS.map((key) => {
            const meta = BUSINESS_MODEL_SECTION_META[key];
            return (
              <div
                key={key}
                class={`lc-canvas__cell bmc-canvas__cell--${meta.gridArea}`}
              >
                <SectionBlock
                  id={bmc.id}
                  sectionKey={key}
                  label={meta.label}
                  items={bmc[key as keyof BusinessModel] as string[]}
                  editing={editing}
                  editSuffix={editSuffix}
                />
              </div>
            );
          })}
        </div>

        {/* -- Notes --------------------------------------------------------- */}
        <MarkdownSection title="Notes" markdown={bmc.notes} />

        <AuditMeta
          createdAt={bmc.createdAt}
          updatedAt={bmc.updatedAt}
          createdBy={bmc.createdBy}
          updatedBy={bmc.updatedBy}
        />
      </main>

      <div id="business-models-form-container" />
    </MainLayout>
  );
};
