// Risk preview — read-only sidenav panel content.

import type { FC } from "hono/jsx";
import type { Risk } from "../../types/risk.types.ts";
import { toKebab } from "../../utils/slug.ts";
import { InfoItem } from "./info-item.tsx";
import { MarkdownSection } from "./markdown-section.tsx";
import { badgeClass } from "../../components/ui/status-badge.tsx";
import { RISK_STATUS_VARIANTS } from "../../domains/risk/constants.tsx";

type Props = { item: Risk };

export const RiskPreview: FC<Props> = ({ item: risk }) => {
  const score = risk.likelihood * risk.impact;

  return (
    <div class="risk-preview">
      <div class="risk-preview__badges">
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

      <dl class="detail-meta">
        <InfoItem label="Likelihood">{String(risk.likelihood)} / 5</InfoItem>
        <InfoItem label="Impact">{String(risk.impact)} / 5</InfoItem>
        {risk.owner && <InfoItem label="Owner">{risk.owner}</InfoItem>}
        {risk.project && (
          <InfoItem label="Project">
            <a href={`/portfolio/${toKebab(risk.project)}`}>{risk.project}</a>
          </InfoItem>
        )}
      </dl>

      <MarkdownSection title="Description" markdown={risk.description} />
      <MarkdownSection title="Mitigation Plan" markdown={risk.mitigation} />

      {risk.tags && risk.tags.length > 0 && (
        <div class="risk-preview__tags">
          {risk.tags.map((tag) => <span key={tag} class="badge">{tag}</span>)}
        </div>
      )}

      <div class="risk-preview__footer">
        <a href={`/risks/${risk.id}`} class="btn btn--secondary btn--sm">
          Open full detail
        </a>
      </div>
    </div>
  );
};
