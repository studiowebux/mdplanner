import type { FC } from "hono/jsx";
import { MainLayout } from "../components/layout/main.tsx";
import { BackButton } from "./components/back-button.tsx";
import type { OnboardingTemplate } from "../types/onboarding-template.types.ts";
import type { ViewProps } from "../types/app.ts";
import { DetailActions } from "./components/detail-actions.tsx";
import { SseRefresh } from "./components/sse-refresh.tsx";
import { AuditMeta } from "./components/audit-meta.tsx";

export const OnboardingTemplateDetailView: FC<
  ViewProps & { item: OnboardingTemplate }
> = ({ item: tmpl, ...viewProps }) => (
  <MainLayout
    title={tmpl.name}
    {...viewProps}
    styles={["/css/views/onboarding-templates.css"]}
  >
    <SseRefresh
      getUrl={"/onboarding-templates/" + tmpl.id}
      trigger="sse:onboarding-template.updated"
      targetId="onboarding-template-detail-root"
    />
    <main
      id="onboarding-template-detail-root"
      class="detail-view onboarding-template-detail"
    >
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
        />
      </header>

      {/* -- Description --------------------------------------------------- */}
      {tmpl.description && (
        <div class="detail-section onboarding-template-detail__description">
          <p class="onboarding-template-detail__desc-text">
            {tmpl.description}
          </p>
        </div>
      )}

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
