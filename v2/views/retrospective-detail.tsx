import type { FC } from "hono/jsx";
import { MainLayout } from "../components/layout/main.tsx";
import { BackButton } from "./components/back-button.tsx";
import type { Retrospective } from "../types/retrospective.types.ts";
import { RETROSPECTIVE_SECTIONS } from "../types/retrospective.types.ts";
import type { ViewProps } from "../types/app.ts";
import { formatDate } from "../utils/time.ts";
import { DetailActions } from "./components/detail-actions.tsx";
import { SseRefresh } from "./components/sse-refresh.tsx";
import { InfoItem } from "./components/info-item.tsx";
import { AuditMeta } from "./components/audit-meta.tsx";

// ---------------------------------------------------------------------------
// Section renderer
// ---------------------------------------------------------------------------

const SectionBlock: FC<{ label: string; items: string[] }> = (
  { label, items },
) => (
  <div class="retro-detail__section">
    <h3 class="retro-detail__section-title">{label}</h3>
    {items.length === 0
      ? <p class="retro-detail__empty">Nothing added yet.</p>
      : (
        <ul class="retro-detail__list">
          {items.map((item, i) => <li key={i}>{item}</li>)}
        </ul>
      )}
  </div>
);

// ---------------------------------------------------------------------------
// Main view
// ---------------------------------------------------------------------------

export const RetrospectiveDetailView: FC<
  ViewProps & { item: Retrospective }
> = ({ item: retro, ...viewProps }) => {
  return (
    <MainLayout
      title={retro.title}
      {...viewProps}
      styles={["/css/views/retrospectives.css"]}
    >
      <SseRefresh
        getUrl={"/retrospectives/" + retro.id}
        trigger="sse:retrospective.updated"
        targetId="retro-detail-root"
      />
      <main id="retro-detail-root" class="detail-view retro-detail">
        <BackButton href="/retrospectives" label="Back to Retrospectives" />

        {/* -- Header ---------------------------------------------------- */}
        <header class="detail-section retro-detail__header">
          <div class="detail-title-row">
            <h1 class="detail-title">{retro.title}</h1>
            <span
              class={`badge badge--${
                retro.status === "closed" ? "success" : "warning"
              }`}
            >
              {retro.status}
            </span>
          </div>
          <DetailActions
            entity="retrospectives"
            id={retro.id}
            title={retro.title}
            formContainerId="retrospectives-form-container"
          />
        </header>

        {/* -- Info ------------------------------------------------------- */}
        {retro.date && (
          <div class="detail-section detail-info-row">
            <InfoItem label="Date">{retro.date}</InfoItem>
          </div>
        )}

        {/* -- Participants --------------------------------------------- */}
        {retro.participants.length > 0 && (
          <div class="detail-section retro-detail__participants">
            <h3 class="retro-detail__participants-label">Participants</h3>
            <ul class="retro-detail__participants-list">
              {retro.participants.map((p, i) => <li key={i}>{p}</li>)}
            </ul>
          </div>
        )}

        {/* -- Sections -------------------------------------------------- */}
        <div class="retro-detail__grid">
          {RETROSPECTIVE_SECTIONS.map((s) => (
            <SectionBlock
              key={s.key}
              label={s.label}
              items={retro[s.key as keyof Retrospective] as string[]}
            />
          ))}
        </div>

        {/* -- Meta ------------------------------------------------------- */}
        <div class="detail-section retro-detail__meta">
          <span>Created {formatDate(retro.createdAt)}</span>
          {retro.updatedAt && retro.updatedAt !== retro.createdAt && (
            <span>&middot; Updated {formatDate(retro.updatedAt)}</span>
          )}
        </div>
        <AuditMeta
          createdAt={retro.createdAt}
          updatedAt={retro.updatedAt}
          createdBy={retro.createdBy}
          updatedBy={retro.updatedBy}
        />
      </main>

      <div id="retrospectives-form-container" />
    </MainLayout>
  );
};
