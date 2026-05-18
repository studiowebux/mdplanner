import type { FC } from "hono/jsx";
import { MainLayout } from "../components/layout/main.tsx";
import { BackButton } from "./components/back-button.tsx";
import type { Risk } from "../types/risk.types.ts";
import type { ViewProps } from "../types/app.ts";
import { toKebab } from "../utils/slug.ts";
import { MarkdownSection } from "./components/markdown-section.tsx";
import { DetailActions } from "./components/detail-actions.tsx";
import { SseRefresh } from "./components/sse-refresh.tsx";
import { InfoItem } from "./components/info-item.tsx";
import { AuditMeta } from "./components/audit-meta.tsx";
import { badgeClass } from "../components/ui/status-badge.tsx";
import { RISK_STATUS_VARIANTS } from "../domains/risk/constants.tsx";

export const RiskDetailView: FC<ViewProps & { item: Risk }> = (
  { item: risk, ...viewProps },
) => {
  const score = risk.likelihood * risk.impact;

  return (
    <MainLayout
      title={risk.title}
      {...viewProps}
      styles={["/css/views/risks.css"]}
    >
      <SseRefresh
        getUrl={"/risks/" + risk.id}
        trigger="sse:risk.updated"
        targetId="risk-detail-root"
      />
      <main id="risk-detail-root" class="detail-view risk-detail">
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
          />
        </header>

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
        <MarkdownSection title="Description" markdown={risk.description} />

        {/* -- Mitigation ------------------------------------------------ */}
        <MarkdownSection title="Mitigation Plan" markdown={risk.mitigation} />

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
