import type { FC } from "hono/jsx";
import { MainLayout } from "../components/layout/main.tsx";
import { BackButton } from "./components/back-button.tsx";
import type { Fishbone } from "../types/fishbone.types.ts";
import type { ViewProps } from "../types/app.ts";
import { toKebab } from "../utils/slug.ts";
import { DetailActions } from "./components/detail-actions.tsx";
import { SseRefresh } from "./components/sse-refresh.tsx";
import { InfoItem } from "./components/info-item.tsx";
import { AuditMeta } from "./components/audit-meta.tsx";

export const FishboneDetailView: FC<ViewProps & { item: Fishbone }> = (
  { item: fishbone, ...viewProps },
) => {
  return (
    <MainLayout
      title={fishbone.title}
      {...viewProps}
      styles={["/css/views/fishbone.css"]}
      scripts={["/js/fullscreen-reading.js"]}
    >
      <SseRefresh
        getUrl={"/fishbones/" + fishbone.id}
        trigger="sse:fishbone.updated"
        targetId="fishbone-detail-root"
      />
      <main id="fishbone-detail-root" class="detail-view fishbone-detail">
        <BackButton href="/fishbones" label="Back to Fishbone Diagrams" />

        {/* -- Header ---------------------------------------------------- */}
        <header class="detail-section fishbone-detail__header">
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
          >
            <button
              type="button"
              class="btn btn--secondary btn--sm"
              data-fullscreen-toggle
            >
              Focus
            </button>
          </DetailActions>
        </header>

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
                    <h2 class="quadrant-card__title">{cause.section}</h2>
                    <span class="badge">{cause.items.length}</span>
                  </div>
                  {cause.items.length > 0
                    ? (
                      <ul class="quadrant-card__list">
                        {cause.items.map((item, i) => (
                          <li key={i} class="quadrant-card__item">
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    )
                    : <p class="quadrant-card__empty">No items yet</p>}
                </div>
              ))}
            </div>
          )
          : (
            <div class="detail-section">
              <p class="empty-state__text">No cause sections defined yet.</p>
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
