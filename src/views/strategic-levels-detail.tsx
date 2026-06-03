import type { FC } from "hono/jsx";
import { MainLayout } from "../components/layout/main.tsx";
import { BackButton } from "./components/back-button.tsx";
import { Breadcrumb } from "../components/ui/breadcrumb.tsx";
import { immediateDeleteConfirm } from "../utils/confirm.ts";
import type { StrategicLevelsBuilder } from "../types/strategic-levels.types.ts";
import { LEVEL_ORDER } from "../types/strategic-levels.types.ts";
import type { ViewProps } from "../types/app.ts";
import { DetailActions } from "./components/detail-actions.tsx";
import { EditModeToggle } from "./components/edit-mode-toggle.tsx";
import { SseRefresh } from "./components/sse-refresh.tsx";
import { AuditMeta } from "./components/audit-meta.tsx";
import { ArchivedBanner } from "./components/archived-banner.tsx";
import { LEVEL_LABELS } from "../domains/strategic-levels/cache.ts";

export const StrategicLevelsDetailView: FC<
  ViewProps & { item: StrategicLevelsBuilder; editing?: boolean }
> = ({ item: builder, editing = false, ...viewProps }) => {
  const editSuffix = editing ? "?editing=true" : "";

  const byType = new Map<string, typeof builder.levels>();
  for (const levelType of LEVEL_ORDER) {
    byType.set(levelType, []);
  }
  for (const level of builder.levels) {
    byType.get(level.level)?.push(level);
  }

  return (
    <MainLayout
      title={builder.title}
      {...viewProps}
      styles={["/css/views/strategic-levels.css"]}
      scripts={["/js/quadrant-edit.js"]}
    >
      <SseRefresh
        getUrl={"/strategic-levels/" + builder.id + editSuffix}
        trigger="sse:strategic-levels.updated"
        targetId="sl-detail-root"
      />
      <main
        id="sl-detail-root"
        class={`detail-view sl-detail${editing ? " sl-detail--editing" : ""}`}
      >
        <Breadcrumb
          items={[
            { label: "Strategic Levels", href: "/strategic-levels" },
            { label: builder.title },
          ]}
        />
        <BackButton href="/strategic-levels" label="Back to Strategic Levels" />

        <header class="detail-section detail-header sl-detail__header">
          <div>
            <h1 class="detail-title">{builder.title}</h1>
            <span class="sl-detail__date">{builder.date}</span>
          </div>
          <DetailActions
            entity="strategic-levels"
            id={builder.id}
            title={builder.title}
            formContainerId="strategic-levels-form-container"
            archived={builder.archived === true}
          >
            <EditModeToggle
              href={`/strategic-levels/${builder.id}`}
              editing={editing}
            />
          </DetailActions>
        </header>

        <ArchivedBanner entity={builder} />

        <div class="detail-section sl-detail__groups">
          {LEVEL_ORDER.map((levelType) => {
            const levels = (byType.get(levelType) ?? []).sort(
              (a, b) => a.order - b.order,
            );
            if (!editing && levels.length === 0) return null;
            return (
              <div
                class={`sl-group${editing ? " sl-group--editing" : ""}`}
                data-level={levelType}
                key={levelType}
              >
                <h2 class="sl-group__heading">{LEVEL_LABELS[levelType]}</h2>
                <div class="sl-group__body">
                  <ul class="sl-group__items">
                    {levels.map((level) => (
                      <li class="sl-item" key={level.id}>
                        {editing
                          ? (
                            <>
                              <input
                                type="text"
                                id={`qed-sl-${level.id}`}
                                class="sl-item__input"
                                name="title"
                                value={level.title}
                                data-quadrant-edit={`/strategic-levels/${builder.id}/levels/${level.id}${editSuffix}`}
                                hx-put={`/strategic-levels/${builder.id}/levels/${level.id}${editSuffix}`}
                                hx-trigger="quadrant-save"
                                hx-target="#sl-detail-root"
                                hx-select="#sl-detail-root"
                                hx-swap="outerHTML"
                                hx-include="this"
                              />
                              <button
                                type="button"
                                class="quadrant-card__save btn btn--primary btn--sm is-hidden"
                                data-quadrant-save-for={`qed-sl-${level.id}`}
                                aria-label="Save"
                              >
                                ✓
                              </button>
                              <button
                                type="button"
                                class="sl-item__remove"
                                hx-delete={`/strategic-levels/${builder.id}/levels/${level.id}${editSuffix}`}
                                {...immediateDeleteConfirm(`"${level.title}"`)}
                                hx-target="#sl-detail-root"
                                hx-select="#sl-detail-root"
                                hx-swap="outerHTML"
                                aria-label={`Remove "${level.title}"`}
                              >
                                &times;
                              </button>
                            </>
                          )
                          : <span class="sl-item__title">{level.title}</span>}
                      </li>
                    ))}
                  </ul>
                  {editing && (
                    <div class="sl-group__add">
                      <input
                        type="text"
                        class="sl-group__add-input"
                        name="title"
                        placeholder={`Add ${LEVEL_LABELS[levelType]}...`}
                        data-quadrant-add={`/strategic-levels/${builder.id}/levels/${levelType}${editSuffix}`}
                        hx-post={`/strategic-levels/${builder.id}/levels/${levelType}${editSuffix}`}
                        hx-trigger="quadrant-submit"
                        hx-target="#sl-detail-root"
                        hx-select="#sl-detail-root"
                        hx-swap="outerHTML"
                        hx-include="this"
                        autocomplete="off"
                      />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <AuditMeta
          createdAt={builder.createdAt}
          updatedAt={builder.updatedAt}
          createdBy={builder.createdBy}
          updatedBy={builder.updatedBy}
        />
      </main>

      <div id="strategic-levels-form-container" />
    </MainLayout>
  );
};
