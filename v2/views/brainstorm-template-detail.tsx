import type { FC } from "hono/jsx";
import { MainLayout } from "../components/layout/main.tsx";
import { BackButton } from "./components/back-button.tsx";
import { Breadcrumb } from "../components/ui/breadcrumb.tsx";
import type { BrainstormTemplate } from "../types/brainstorm-template.types.ts";
import type { ViewProps } from "../types/app.ts";
import { DetailActions } from "./components/detail-actions.tsx";
import { SseRefresh } from "./components/sse-refresh.tsx";
import { AuditMeta } from "./components/audit-meta.tsx";

export const BrainstormTemplateDetailView: FC<
  ViewProps & { item: BrainstormTemplate }
> = ({ item: template, ...viewProps }) => {
  const hasCategories = template.categories && template.categories.length > 0;

  return (
    <MainLayout
      title={template.name}
      {...viewProps}
      styles={["/css/views/brainstorm-templates.css"]}
    >
      <SseRefresh
        getUrl={"/brainstorm-templates/" + template.id}
        trigger="sse:btemplate.updated"
        targetId="btemplate-detail-root"
      />
      <main id="btemplate-detail-root" class="detail-view btemplate-detail">
        <Breadcrumb
          items={[
            { label: "Brainstorm Templates", href: "/brainstorm-templates" },
            { label: template.name },
          ]}
        />
        <BackButton
          href="/brainstorm-templates"
          label="Back to Brainstorm Templates"
        />

        {/* -- Header ---------------------------------------------------- */}
        <header class="detail-section detail-header btemplate-detail__header">
          <div class="btemplate-detail__title-row">
            <h1 class="detail-title btemplate-detail__title">
              {template.name}
            </h1>
            {hasCategories && (
              <div class="btemplate-detail__categories">
                {template.categories!.map((cat) => (
                  <span key={cat} class="badge badge--sm badge--neutral">
                    {cat}
                  </span>
                ))}
              </div>
            )}
          </div>
          <DetailActions
            entity="brainstorm-templates"
            id={template.id}
            title={template.name}
            formContainerId="brainstorm-templates-form-container"
          />
        </header>

        {/* -- Description ----------------------------------------------- */}
        {template.description && (
          <div class="detail-section">
            <p class="detail-description">{template.description}</p>
          </div>
        )}

        {/* -- Questions ------------------------------------------------- */}
        <section class="detail-section btemplate-detail__questions">
          <h2 class="section-heading">
            Questions ({template.questions.length})
          </h2>
          {template.questions.length === 0
            ? (
              <p class="btemplate-detail__empty">
                No questions yet. Edit this template to add some.
              </p>
            )
            : (
              <ol class="btemplate-detail__question-list">
                {template.questions.map((q, i) => (
                  <li key={i} class="btemplate-detail__question-item">
                    {q}
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

      <div id="brainstorm-templates-form-container" />
    </MainLayout>
  );
};
