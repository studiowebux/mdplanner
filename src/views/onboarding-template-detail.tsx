import type { FC } from "hono/jsx";
import { MainLayout } from "../components/layout/main.tsx";
import { BackButton } from "./components/back-button.tsx";
import { Breadcrumb } from "../components/ui/breadcrumb.tsx";
import type { OnboardingTemplate } from "../types/onboarding-template.types.ts";
import type { ViewProps } from "../types/app.ts";
import { DetailActions } from "./components/detail-actions.tsx";
import { ArchivedBanner } from "./components/archived-banner.tsx";
import { SseRefresh } from "./components/sse-refresh.tsx";
import { AuditMeta } from "./components/audit-meta.tsx";
import { MarkdownSection } from "./components/markdown-section.tsx";
import { EditModeToggle } from "./components/edit-mode-toggle.tsx";

const DescriptionSection: FC<{ item: OnboardingTemplate }> = ({ item }) => (
  <section class="detail-section">
    <h2 class="section-heading">Description</h2>
    <div
      class="inline-editable"
      contenteditable
      data-inline-edit
      data-inline-original={item.description ?? ""}
      data-inline-target="onboarding-template-description-value"
      data-inline-save-btn="onboarding-template-description-save"
    >
      {item.description ?? ""}
    </div>
    <input
      type="hidden"
      id="onboarding-template-description-value"
      name="description"
      value={item.description ?? ""}
    />
    <div class="inline-editable__actions">
      <button
        type="button"
        id="onboarding-template-description-save"
        class="btn btn--primary btn--sm is-hidden"
        hx-put={`/onboarding-templates/${item.id}/description?editing=true`}
        hx-include="#onboarding-template-description-value"
        hx-target="#onboarding-template-detail-root"
        hx-select="#onboarding-template-detail-root"
        hx-swap="outerHTML"
      >
        Save
      </button>
    </div>
  </section>
);

export const OnboardingTemplateDetailView: FC<
  ViewProps & { item: OnboardingTemplate; editing?: boolean }
> = ({ item: tmpl, editing = false, ...viewProps }) => (
  <MainLayout
    title={tmpl.name}
    {...viewProps}
    styles={["/css/views/onboarding-templates.css"]}
    scripts={["/js/inline-edit.js"]}
  >
    <SseRefresh
      getUrl={"/onboarding-templates/" + tmpl.id +
        (editing ? "?editing=true" : "")}
      trigger="sse:onboarding-template.updated"
      targetId="onboarding-template-detail-root"
    />
    <main
      id="onboarding-template-detail-root"
      class={`detail-view onboarding-template-detail${
        editing ? " onboarding-template-detail--editing" : ""
      }`}
    >
      <Breadcrumb
        items={[
          { label: "Onboarding Templates", href: "/onboarding-templates" },
          { label: tmpl.name },
        ]}
      />
      <BackButton
        href="/onboarding-templates"
        label="Back to Onboarding Templates"
      />

      {/* -- Header -------------------------------------------------------- */}
      <header class="detail-section detail-header onboarding-template-detail__header">
        <div class="onboarding-template-detail__title-row">
          <h1 class="detail-title onboarding-template-detail__title">
            {tmpl.name}
          </h1>
          <div class="onboarding-template-detail__meta-row">
            {tmpl.role && (
              <span class="badge badge--sm badge--accent">{tmpl.role}</span>
            )}
            {tmpl.tags?.map((tag) => (
              <span key={tag} class="badge badge--sm badge--neutral">
                {tag}
              </span>
            ))}
          </div>
        </div>
        <DetailActions
          entity="onboarding-templates"
          id={tmpl.id}
          title={tmpl.name}
          formContainerId="onboarding-templates-form-container"
          archived={tmpl.archived === true}
        >
          <EditModeToggle
            href={`/onboarding-templates/${tmpl.id}`}
            editing={editing}
          />
        </DetailActions>
      </header>

      <ArchivedBanner entity={tmpl} />

      {/* -- Description --------------------------------------------------- */}
      {editing
        ? <DescriptionSection item={tmpl} />
        : <MarkdownSection title="Description" markdown={tmpl.description} />}

      {/* -- Steps --------------------------------------------------------- */}
      <section class="detail-section onboarding-template-detail__steps">
        <h2 class="section-heading">Steps ({tmpl.steps.length})</h2>
        {tmpl.steps.length === 0
          ? (
            <p class="onboarding-template-detail__empty">
              No steps yet. Edit this template to add some.
            </p>
          )
          : (
            <ol class="onboarding-template-detail__step-list">
              {tmpl.steps.map((s, i) => (
                <li key={i} class="onboarding-template-detail__step-item">
                  <span class="onboarding-template-detail__step-title">
                    {s.title}
                  </span>
                  <span class="badge badge--sm badge--neutral">
                    {s.category}
                  </span>
                </li>
              ))}
            </ol>
          )}
      </section>

      {/* -- Meta ---------------------------------------------------------- */}
      <AuditMeta
        createdAt={tmpl.createdAt}
        updatedAt={tmpl.updatedAt}
        createdBy={tmpl.createdBy}
        updatedBy={tmpl.updatedBy}
      />
    </main>

    <div id="onboarding-templates-form-container" />
  </MainLayout>
);
