import type { FC } from "hono/jsx";
import { MainLayout } from "../components/layout/main.tsx";
import { BackButton } from "./components/back-button.tsx";
import { Breadcrumb } from "../components/ui/breadcrumb.tsx";
import type { ReflectionTemplate } from "../types/reflection-template.types.ts";
import type { ViewProps } from "../types/app.ts";
import { DetailActions } from "./components/detail-actions.tsx";
import { SseRefresh } from "./components/sse-refresh.tsx";
import { AuditMeta } from "./components/audit-meta.tsx";
import { ArchivedBanner } from "./components/archived-banner.tsx";
import { MarkdownSection } from "./components/markdown-section.tsx";
import { EditModeToggle } from "./components/edit-mode-toggle.tsx";

const DescriptionSection: FC<{ item: ReflectionTemplate }> = ({ item }) => (
  <section class="detail-section">
    <h2 class="section-heading">Description</h2>
    <div
      class="inline-editable"
      contenteditable
      data-inline-edit
      data-inline-original={item.description ?? ""}
      data-inline-target="rtemplate-description-value"
      data-inline-save-btn="rtemplate-description-save"
    >
      {item.description ?? ""}
    </div>
    <input
      type="hidden"
      id="rtemplate-description-value"
      name="description"
      value={item.description ?? ""}
    />
    <div class="inline-editable__actions">
      <button
        type="button"
        id="rtemplate-description-save"
        class="btn btn--primary btn--sm is-hidden"
        hx-put={`/reflection-templates/${item.id}/description?editing=true`}
        hx-include="#rtemplate-description-value"
        hx-target="#rtemplate-detail-root"
        hx-select="#rtemplate-detail-root"
        hx-swap="outerHTML"
      >
        Save
      </button>
    </div>
  </section>
);

export const ReflectionTemplateDetailView: FC<
  ViewProps & { item: ReflectionTemplate; editing?: boolean }
> = ({ item: template, editing = false, ...viewProps }) => {
  const hasCategories = template.categories && template.categories.length > 0;

  return (
    <MainLayout
      title={template.name}
      {...viewProps}
      styles={["/css/views/reflection-templates.css"]}
      scripts={["/js/inline-edit.js"]}
    >
      <SseRefresh
        getUrl={"/reflection-templates/" + template.id +
          (editing ? "?editing=true" : "")}
        trigger="sse:rtemplate.updated"
        targetId="rtemplate-detail-root"
      />
      <main
        id="rtemplate-detail-root"
        class={`detail-view rtemplate-detail${
          editing ? " rtemplate-detail--editing" : ""
        }`}
      >
        <Breadcrumb
          items={[
            { label: "Reflection Templates", href: "/reflection-templates" },
            { label: template.name },
          ]}
        />
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
            archived={template.archived === true}
          >
            <EditModeToggle
              href={`/reflection-templates/${template.id}`}
              editing={editing}
            />
          </DetailActions>
        </header>

        <ArchivedBanner entity={template} />

        {/* -- Description ----------------------------------------------- */}
        {editing ? <DescriptionSection item={template} /> : (
          <MarkdownSection
            title="Description"
            markdown={template.description}
          />
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
