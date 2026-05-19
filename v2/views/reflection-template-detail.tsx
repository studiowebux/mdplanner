import type { FC } from "hono/jsx";
import { MainLayout } from "../components/layout/main.tsx";
import { BackButton } from "./components/back-button.tsx";
import type { ReflectionTemplate } from "../types/reflection-template.types.ts";
import type { ViewProps } from "../types/app.ts";
import { DetailActions } from "./components/detail-actions.tsx";
import { SseRefresh } from "./components/sse-refresh.tsx";
import { AuditMeta } from "./components/audit-meta.tsx";

export const ReflectionTemplateDetailView: FC<
  ViewProps & { item: ReflectionTemplate }
> = ({ item: template, ...viewProps }) => {
  const hasCategories = template.categories && template.categories.length > 0;

  return (
    <MainLayout
      title={template.name}
      {...viewProps}
      styles={["/css/views/reflection-templates.css"]}
    >
      <SseRefresh
        getUrl={"/reflection-templates/" + template.id}
        trigger="sse:rtemplate.updated"
        targetId="rtemplate-detail-root"
      />
      <main id="rtemplate-detail-root" class="detail-view rtemplate-detail">
        <BackButton
          href="/reflection-templates"
          label="Back to Reflection Templates"
        />

        {/* -- Header ---------------------------------------------------- */}
        <header class="detail-section detail-header rtemplate-detail__header">
          <div class="rtemplate-detail__title-row">
            <h1 class="detail-title rtemplate-detail__title">
              {template.name}
            </h1>
            <div class="rtemplate-detail__meta-row">
              {template.period && (
                <span class="badge badge--sm badge--accent">
                  {template.period}
                </span>
              )}
              {hasCategories &&
                template.categories!.map((cat) => (
                  <span key={cat} class="badge badge--sm badge--neutral">
                    {cat}
                  </span>
                ))}
            </div>
          </div>
          <DetailActions
            entity="reflection-templates"
            id={template.id}
            title={template.name}
            formContainerId="reflection-templates-form-container"
          />
        </header>

        {/* -- Description ----------------------------------------------- */}
        {template.description && (
          <div class="detail-section">
            <p class="detail-description">{template.description}</p>
          </div>
        )}

        {/* -- Prompts --------------------------------------------------- */}
        <section class="detail-section rtemplate-detail__prompts">
          <h2 class="section-heading">
            Prompts ({template.prompts.length})
          </h2>
          {template.prompts.length === 0
            ? (
              <p class="rtemplate-detail__empty">
                No prompts yet. Edit this template to add some.
              </p>
            )
            : (
              <ol class="rtemplate-detail__prompt-list">
                {template.prompts.map((p, i) => (
                  <li key={i} class="rtemplate-detail__prompt-item">
                    {p}
                  </li>
                ))}
              </ol>
            )}
        </section>

        {/* -- Meta ------------------------------------------------------ */}
        <AuditMeta
          createdAt={template.createdAt}
          updatedAt={template.updatedAt}
          createdBy={template.createdBy}
          updatedBy={template.updatedBy}
        />
      </main>

      <div id="reflection-templates-form-container" />
    </MainLayout>
  );
};
