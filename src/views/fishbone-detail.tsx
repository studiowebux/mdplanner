import type { FC } from "hono/jsx";
import { MainLayout } from "../components/layout/main.tsx";
import { BackButton } from "./components/back-button.tsx";
import { Breadcrumb } from "../components/ui/breadcrumb.tsx";
import { immediateDeleteConfirm } from "../utils/confirm.ts";
import type { Fishbone } from "../types/fishbone.types.ts";
import type { ViewProps } from "../types/app.ts";
import { toKebab } from "../utils/slug.ts";
import { DetailActions } from "./components/detail-actions.tsx";
import { EditModeToggle } from "./components/edit-mode-toggle.tsx";
import { ArchivedBanner } from "./components/archived-banner.tsx";
import { SseRefresh } from "./components/sse-refresh.tsx";
import { InfoItem } from "./components/info-item.tsx";
import { AuditMeta } from "./components/audit-meta.tsx";

export const FishboneDetailView: FC<
  ViewProps & { item: Fishbone; editing?: boolean }
> = ({ item: fishbone, editing = false, ...viewProps }) => {
  const editSuffix = editing ? "?editing=true" : "";

  return (
    <MainLayout
      title={fishbone.title}
      {...viewProps}
      styles={["/css/views/fishbone.css"]}
      scripts={["/js/quadrant-edit.js"]}
    >
      <SseRefresh
        getUrl={"/fishbones/" + fishbone.id + editSuffix}
        trigger="sse:fishbone.updated"
        targetId="fishbone-detail-root"
      />
      <main
        id="fishbone-detail-root"
        class={`detail-view fishbone-detail${
          editing ? " fishbone-detail--editing" : ""
        }`}
      >
        <Breadcrumb
          items={[
            { label: "Fishbone Diagrams", href: "/fishbones" },
            { label: fishbone.title },
          ]}
        />
        <BackButton href="/fishbones" label="Back to Fishbone Diagrams" />

        {/* -- Header ---------------------------------------------------- */}
        <header class="detail-section detail-header fishbone-detail__header">
          <div>
            <h1 class="detail-title">{fishbone.title}</h1>
            {fishbone.description && (
              <p class="fishbone-detail__problem">{fishbone.description}</p>
            )}
          </div>
          <DetailActions
            entity="fishbones"
            id={fishbone.id}
            title={fishbone.title}
            formContainerId="fishbones-form-container"
            archived={fishbone.archived === true}
          >
            <EditModeToggle
              href={`/fishbones/${fishbone.id}`}
              editing={editing}
            />
          </DetailActions>
        </header>

        <ArchivedBanner entity={fishbone} />

        {/* -- Project --------------------------------------------------- */}
        {fishbone.project && (
          <div class="detail-section detail-info-row">
            <InfoItem label="Project">
              <a href={`/portfolio/${toKebab(fishbone.project)}`}>
                {fishbone.project}
              </a>
            </InfoItem>
          </div>
        )}

        {/* -- Cause sections -------------------------------------------- */}
        {fishbone.causes.length > 0
          ? (
            <div class="quadrant-grid fishbone-detail__causes">
              {fishbone.causes.map((cause, idx) => (
                <div
                  key={idx}
                  class="quadrant-card"
                  data-quadrant={`cause-${idx % 6}`}
                >
                  <div class="quadrant-card__header">
                    {editing
                      ? (
                        <input
                          type="text"
                          class="quadrant-card__inline-edit fishbone-detail__category-name"
                          name="text"
                          value={cause.section}
                          data-quadrant-edit={`/fishbones/${fishbone.id}/category/${idx}${editSuffix}`}
                          hx-put={`/fishbones/${fishbone.id}/category/${idx}${editSuffix}`}
                          hx-trigger="quadrant-save"
                          hx-target="#fishbone-detail-root"
                          hx-select="#fishbone-detail-root"
                          hx-swap="outerHTML"
                          hx-include="this"
                          aria-label="Category name"
                        />
                      )
                      : <h2 class="quadrant-card__title">{cause.section}</h2>}
                    <span class="badge">{cause.items.length}</span>
                    {editing && (
                      <button
                        type="button"
                        class="quadrant-card__remove fishbone-detail__category-remove"
                        hx-delete={`/fishbones/${fishbone.id}/category/${idx}${editSuffix}`}
                        {...immediateDeleteConfirm(
                          `category "${cause.section}" and all its causes`,
                        )}
                        hx-target="#fishbone-detail-root"
                        hx-select="#fishbone-detail-root"
                        hx-swap="outerHTML"
                        aria-label={`Remove category "${cause.section}"`}
                      >
                        &times;
                      </button>
                    )}
                  </div>
                  {cause.items.length > 0
                    ? (
                      <ul class="quadrant-card__list">
                        {cause.items.map((item, i) => (
                          <li key={i} class="quadrant-card__item">
                            {editing
                              ? (
                                <input
                                  type="text"
                                  class="quadrant-card__inline-edit"
                                  name="text"
                                  value={item}
                                  data-quadrant-edit={`/fishbones/${fishbone.id}/category/${idx}/item/${i}${editSuffix}`}
                                  hx-put={`/fishbones/${fishbone.id}/category/${idx}/item/${i}${editSuffix}`}
                                  hx-trigger="quadrant-save"
                                  hx-target="#fishbone-detail-root"
                                  hx-select="#fishbone-detail-root"
                                  hx-swap="outerHTML"
                                  hx-include="this"
                                />
                              )
                              : <span>{item}</span>}
                            {editing && (
                              <button
                                type="button"
                                class="quadrant-card__remove"
                                hx-delete={`/fishbones/${fishbone.id}/category/${idx}/item/${i}${editSuffix}`}
                                {...immediateDeleteConfirm(`"${item}"`)}
                                hx-target="#fishbone-detail-root"
                                hx-select="#fishbone-detail-root"
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
                        placeholder="Add cause..."
                        data-quadrant-add={`/fishbones/${fishbone.id}/category/${idx}/item${editSuffix}`}
                        hx-post={`/fishbones/${fishbone.id}/category/${idx}/item${editSuffix}`}
                        hx-trigger="quadrant-submit"
                        hx-target="#fishbone-detail-root"
                        hx-select="#fishbone-detail-root"
                        hx-swap="outerHTML"
                        hx-include="this"
                        autocomplete="off"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )
          : (!editing && (
            <div class="detail-section">
              <p class="empty-state__text">No cause sections defined yet.</p>
            </div>
          ))}

        {/* -- Add category (edit mode) ---------------------------------- */}
        {editing && (
          <div class="detail-section fishbone-detail__add-category">
            <input
              type="text"
              class="quadrant-card__input"
              name="text"
              placeholder="Add a cause category (e.g. People, Process, Machine)…"
              aria-label="Add cause category"
              data-quadrant-add={`/fishbones/${fishbone.id}/category${editSuffix}`}
              hx-post={`/fishbones/${fishbone.id}/category${editSuffix}`}
              hx-trigger="quadrant-submit"
              hx-target="#fishbone-detail-root"
              hx-select="#fishbone-detail-root"
              hx-swap="outerHTML"
              hx-include="this"
              autocomplete="off"
            />
          </div>
        )}

        <AuditMeta
          createdAt={fishbone.createdAt}
          updatedAt={fishbone.updatedAt}
          createdBy={fishbone.createdBy}
          updatedBy={fishbone.updatedBy}
        />
      </main>

      <div id="fishbones-form-container" />
    </MainLayout>
  );
};
