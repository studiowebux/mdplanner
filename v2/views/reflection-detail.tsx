import type { FC } from "hono/jsx";
import { MainLayout } from "../components/layout/main.tsx";
import { BackButton } from "./components/back-button.tsx";
import type { Reflection } from "../types/reflection.types.ts";
import { REFLECTION_PERIOD_LABELS } from "../types/reflection.types.ts";
import type { ViewProps } from "../types/app.ts";
import { MarkdownSection } from "./components/markdown-section.tsx";
import { DetailActions } from "./components/detail-actions.tsx";
import { SseRefresh } from "./components/sse-refresh.tsx";
import { InfoItem } from "./components/info-item.tsx";
import { AuditMeta } from "./components/audit-meta.tsx";
import { badgeClass } from "../components/ui/status-badge.tsx";
import { REFLECTION_PERIOD_VARIANTS } from "../domains/reflection/constants.tsx";

export const ReflectionDetailView: FC<ViewProps & { item: Reflection }> = (
  { item: reflection, ...viewProps },
) => {
  return (
    <MainLayout
      title={reflection.title}
      {...viewProps}
      styles={[
        "/css/views/reflections.css",
        "/css/views/reflection-templates.css",
      ]}
    >
      <SseRefresh
        getUrl={"/reflections/" + reflection.id}
        trigger="sse:reflection.updated"
        targetId="reflection-detail-root"
      />
      <main id="reflection-detail-root" class="detail-view reflection-detail">
        <BackButton href="/reflections" label="Back to Reflections" />

        <header class="detail-section reflection-detail__header">
          <div>
            <h1 class="detail-title">{reflection.title}</h1>
            <div class="reflection-detail__badges">
              <span
                class={badgeClass(
                  REFLECTION_PERIOD_VARIANTS,
                  reflection.period,
                )}
              >
                {REFLECTION_PERIOD_LABELS[reflection.period]}
              </span>
              {reflection.tags &&
                reflection.tags.map((tag) => (
                  <span key={tag} class="badge">{tag}</span>
                ))}
            </div>
          </div>
          <div class="reflection-detail__header-actions">
            <button
              type="button"
              class="btn btn--secondary btn--sm"
              hx-get={`/reflections/${reflection.id}/template-picker`}
              hx-target="#reflections-template-picker-container"
              hx-swap="innerHTML"
            >
              Use Template
            </button>
            <DetailActions
              entity="reflections"
              id={reflection.id}
              title={reflection.title}
              formContainerId="reflections-form-container"
            />
          </div>
        </header>

        <div class="detail-section detail-info-row">
          <InfoItem label="Period">
            {REFLECTION_PERIOD_LABELS[reflection.period]}
          </InfoItem>
          <InfoItem label="Date">{reflection.date}</InfoItem>
        </div>

        <MarkdownSection title="Content" markdown={reflection.content} />

        <AuditMeta
          createdAt={reflection.createdAt}
          updatedAt={reflection.updatedAt}
          createdBy={reflection.createdBy}
          updatedBy={reflection.updatedBy}
        />
      </main>

      <div id="reflections-form-container" />
      <div id="reflections-template-picker-container" />
    </MainLayout>
  );
};
