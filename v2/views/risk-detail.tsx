import type { FC } from "hono/jsx";
import { MainLayout } from "../components/layout/main.tsx";
import { BackButton } from "./components/back-button.tsx";
import { Breadcrumb } from "../components/ui/breadcrumb.tsx";
import type { Risk } from "../types/risk.types.ts";
import type { ViewProps } from "../types/app.ts";
import { toKebab } from "../utils/slug.ts";
import { MarkdownSection } from "./components/markdown-section.tsx";
import { DetailActions } from "./components/detail-actions.tsx";
import { SseRefresh } from "./components/sse-refresh.tsx";
import { InfoItem } from "./components/info-item.tsx";
import { AuditMeta } from "./components/audit-meta.tsx";
import { ArchivedBanner } from "./components/archived-banner.tsx";
import { badgeClass } from "../components/ui/status-badge.tsx";
import { RISK_STATUS_VARIANTS } from "../domains/risk/constants.tsx";
import { EditModeToggle } from "./components/edit-mode-toggle.tsx";

const InlineEditSection: FC<{
  risk: Risk;
  field: "description" | "mitigation";
  title: string;
}> = ({ risk, field, title }) => {
  const value = (risk[field] ?? "") as string;
  const inputId = `risk-${field}-value`;
  const btnId = `risk-${field}-save`;
  return (
    <section class="detail-section">
      <h2 class="section-heading">{title}</h2>
      <div
        class="inline-editable"
        contenteditable
        data-inline-edit
        data-inline-original={value}
        data-inline-target={inputId}
        data-inline-save-btn={btnId}
      >
        {value}
      </div>
      <input type="hidden" id={inputId} name={field} value={value} />
      <div class="inline-editable__actions">
        <button
          type="button"
          id={btnId}
          class="btn btn--primary btn--sm is-hidden"
          hx-put={`/risks/${risk.id}/${field}?editing=true`}
          hx-include={`#${inputId}`}
          hx-target="#risk-detail-root"
          hx-select="#risk-detail-root"
          hx-swap="outerHTML"
        >
          Save
        </button>
      </div>
    </section>
  );
};

export const RiskDetailView: FC<
  ViewProps & { item: Risk; editing?: boolean }
> = (
  { item: risk, editing = false, ...viewProps },
) => {
  const score = risk.likelihood * risk.impact;

  return (
    <MainLayout
      title={risk.title}
      {...viewProps}
      styles={["/css/views/risks.css"]}
      scripts={["/js/inline-edit.js"]}
    >
      <SseRefresh
        getUrl={"/risks/" + risk.id + (editing ? "?editing=true" : "")}
        trigger="sse:risk.updated"
        targetId="risk-detail-root"
      />
      <main
        id="risk-detail-root"
        class={`detail-view risk-detail${
          editing ? " risk-detail--editing" : ""
        }`}
      >
        <Breadcrumb
          items={[
            { label: "Risks", href: "/risks" },
            { label: risk.title },
          ]}
        />
        <BackButton href="/risks" label="Back to Risks" />

        {/* -- Header ---------------------------------------------------- */}
        <header class="detail-section detail-header risk-detail__header">
          <div>
            <h1 class="detail-title">{risk.title}</h1>
            <div class="risk-detail__badges">
              <span class={badgeClass(RISK_STATUS_VARIANTS, risk.status)}>
                {risk.status}
              </span>
              <span class="badge badge--accent">{risk.category}</span>
              <span
                class="badge risk-score-badge"
                title="Risk score (likelihood × impact)"
              >
                Score: {score}
              </span>
            </div>
          </div>
          <DetailActions
            entity="risks"
            id={risk.id}
            title={risk.title}
            formContainerId="risks-form-container"
            archived={risk.archived === true}
          >
            <EditModeToggle href={`/risks/${risk.id}`} editing={editing} />
          </DetailActions>
        </header>

        <ArchivedBanner entity={risk} />

        {/* -- Info row -------------------------------------------------- */}
        <div class="detail-section detail-info-row">
          <InfoItem label="Likelihood">{String(risk.likelihood)} / 5</InfoItem>
          <InfoItem label="Impact">{String(risk.impact)} / 5</InfoItem>
          {risk.owner && <InfoItem label="Owner">{risk.owner}</InfoItem>}
          {risk.project && (
            <InfoItem label="Project">
              <a href={`/portfolio/${toKebab(risk.project)}`}>
                {risk.project}
              </a>
            </InfoItem>
          )}
        </div>

        {/* -- Description ----------------------------------------------- */}
        {editing
          ? (
            <InlineEditSection
              risk={risk}
              field="description"
              title="Description"
            />
          )
          : <MarkdownSection title="Description" markdown={risk.description} />}

        {/* -- Mitigation ------------------------------------------------ */}
        {editing
          ? (
            <InlineEditSection
              risk={risk}
              field="mitigation"
              title="Mitigation Plan"
            />
          )
          : (
            <MarkdownSection
              title="Mitigation Plan"
              markdown={risk.mitigation}
            />
          )}

        {/* -- Tags ------------------------------------------------------ */}
        {risk.tags && risk.tags.length > 0 && (
          <div class="detail-section">
            <h2 class="section-heading">Tags</h2>
            <div class="tag-list">
              {risk.tags.map((tag) => (
                <span key={tag} class="badge">{tag}</span>
              ))}
            </div>
          </div>
        )}

        <AuditMeta
          createdAt={risk.createdAt}
          updatedAt={risk.updatedAt}
          createdBy={risk.createdBy}
          updatedBy={risk.updatedBy}
        />
      </main>

      <div id="risks-form-container" />
    </MainLayout>
  );
};
