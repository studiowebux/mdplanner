import type { FC } from "hono/jsx";
import { MainLayout } from "../components/layout/main.tsx";
import { BackButton } from "./components/back-button.tsx";
import { Breadcrumb } from "../components/ui/breadcrumb.tsx";
import type { Reflection } from "../types/reflection.types.ts";
import { REFLECTION_PERIOD_LABELS } from "../types/reflection.types.ts";
import type { ReflectionTemplate } from "../types/reflection-template.types.ts";
import type { ViewProps } from "../types/app.ts";
import { MarkdownSection } from "./components/markdown-section.tsx";
import { DetailActions } from "./components/detail-actions.tsx";
import { EditModeToggle } from "./components/edit-mode-toggle.tsx";
import { SseRefresh } from "./components/sse-refresh.tsx";
import { InfoItem } from "./components/info-item.tsx";
import { AuditMeta } from "./components/audit-meta.tsx";
import { ArchivedBanner } from "./components/archived-banner.tsx";
import { badgeClass } from "../components/ui/status-badge.tsx";
import { REFLECTION_PERIOD_VARIANTS } from "../domains/reflection/constants.tsx";

// ---------------------------------------------------------------------------
// Content — read (markdown) or in-place editable (contenteditable + Save).
// ---------------------------------------------------------------------------

const ContentSection: FC<{ reflection: Reflection }> = ({ reflection }) => (
  <section class="detail-section">
    <h2 class="section-heading">Content</h2>
    <div
      class="inline-editable"
      contenteditable
      data-inline-edit
      data-inline-original={reflection.content ?? ""}
      data-inline-target="reflection-content-value"
      data-inline-save-btn="reflection-content-save"
    >
      {reflection.content ?? ""}
    </div>
    <input
      type="hidden"
      id="reflection-content-value"
      name="content"
      value={reflection.content ?? ""}
    />
    <div class="inline-editable__actions">
      <button
        type="button"
        id="reflection-content-save"
        class="btn btn--primary btn--sm is-hidden"
        hx-put={`/reflections/${reflection.id}/content?editing=true`}
        hx-include="#reflection-content-value"
        hx-target="#reflection-detail-root"
        hx-select="#reflection-detail-root"
        hx-swap="outerHTML"
      >
        Save
      </button>
    </div>
  </section>
);

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export const ReflectionDetailView: FC<
  ViewProps & {
    item: Reflection;
    template?: ReflectionTemplate | null;
    editing?: boolean;
  }
> = (
  { item: reflection, template = null, editing = false, ...viewProps },
) => {
  return (
    <MainLayout
      title={reflection.title}
      {...viewProps}
      styles={["/css/views/reflections.css"]}
      scripts={["/js/inline-edit.js"]}
    >
      <SseRefresh
        getUrl={"/reflections/" + reflection.id +
          (editing ? "?editing=true" : "")}
        trigger="sse:reflection.updated"
        targetId="reflection-detail-root"
      />
      <main
        id="reflection-detail-root"
        class={`detail-view reflection-detail${
          editing ? " reflection-detail--editing" : ""
        }`}
      >
        <Breadcrumb
          items={[
            { label: "Reflections", href: "/reflections" },
            { label: reflection.title },
          ]}
        />
        <BackButton href="/reflections" label="Back to Reflections" />

        <header class="detail-section detail-header reflection-detail__header">
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
            <DetailActions
              entity="reflections"
              id={reflection.id}
              title={reflection.title}
              formContainerId="reflections-form-container"
              archived={reflection.archived === true}
            >
              <EditModeToggle
                href={`/reflections/${reflection.id}`}
                editing={editing}
              />
            </DetailActions>
          </div>
        </header>

        <ArchivedBanner entity={reflection} />

        <div class="detail-section detail-info-row">
          <InfoItem label="Period">
            {REFLECTION_PERIOD_LABELS[reflection.period]}
          </InfoItem>
          <InfoItem label="Date">{reflection.date}</InfoItem>
          {template && (
            <InfoItem label="Template">
              <a href={`/reflection-templates/${template.id}`}>
                {template.name}
              </a>
            </InfoItem>
          )}
        </div>

        {editing
          ? <ContentSection reflection={reflection} />
          : <MarkdownSection title="Content" markdown={reflection.content} />}

        <AuditMeta
          createdAt={reflection.createdAt}
          updatedAt={reflection.updatedAt}
          createdBy={reflection.createdBy}
          updatedBy={reflection.updatedBy}
        />
      </main>

      <div id="reflections-form-container" />
    </MainLayout>
  );
};
