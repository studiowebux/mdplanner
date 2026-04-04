import type { FC } from "hono/jsx";
import { MainLayout } from "../components/layout/main.tsx";
import { BackButton } from "./components/back-button.tsx";
import type { Brief } from "../types/brief.types.ts";
import { BRIEF_SECTIONS } from "../types/brief.types.ts";
import type { ViewProps } from "../types/app.ts";
import { formatDate } from "../utils/time.ts";
import { DetailActions } from "./components/detail-actions.tsx";
import { SseRefresh } from "./components/sse-refresh.tsx";
import { InfoItem } from "./components/info-item.tsx";
import { BRIEF_RACI_KEYS } from "../domains/brief/constants.ts";
import { AuditMeta } from "./components/audit-meta.tsx";

// ---------------------------------------------------------------------------
// Section renderer
// ---------------------------------------------------------------------------

const SectionBlock: FC<{ label: string; items: string[] }> = (
  { label, items },
) => (
  <div class="brief-detail__section">
    <h3 class="brief-detail__section-title">{label}</h3>
    {items.length === 1
      ? <p class="brief-detail__prose">{items[0]}</p>
      : (
        <ul class="brief-detail__list">
          {items.map((item, i) => <li key={i}>{item}</li>)}
        </ul>
      )}
  </div>
);

// ---------------------------------------------------------------------------
// Main view
// ---------------------------------------------------------------------------

export const BriefDetailView: FC<
  ViewProps & { item: Brief }
> = (
  { item: brief, ...viewProps },
) => {
  const raciSections = BRIEF_SECTIONS.filter((s) => BRIEF_RACI_KEYS.has(s.key));
  const otherSections = BRIEF_SECTIONS.filter((s) =>
    !BRIEF_RACI_KEYS.has(s.key)
  );

  return (
    <MainLayout
      title={brief.title}
      {...viewProps}
      styles={["/css/views/briefs.css"]}
    >
      <SseRefresh
        getUrl={"/briefs/" + brief.id}
        trigger="sse:brief.updated"
        targetId="brief-detail-root"
      />
      <main id="brief-detail-root" class="detail-view brief-detail">
        <BackButton href="/briefs" label="Back to Briefs" />

        {/* -- Header ---------------------------------------------------- */}
        <header class="detail-section brief-detail__header">
          <div class="detail-title-row brief-detail__title-row">
            <h1 class="detail-title brief-detail__title">{brief.title}</h1>
          </div>
          <DetailActions
            entity="briefs"
            id={brief.id}
            title={brief.title}
            formContainerId="briefs-form-container"
          />
        </header>

        {/* -- Info ------------------------------------------------------- */}
        {brief.date && (
          <div class="detail-section detail-info-row">
            <InfoItem label="Date">{brief.date}</InfoItem>
          </div>
        )}

        {/* -- Non-RACI sections ----------------------------------------- */}
        {otherSections.map((s) => {
          const items = brief[s.key as keyof Brief] as string[] | undefined;
          if (!items || items.length === 0) return null;
          return <SectionBlock key={s.key} label={s.label} items={items} />;
        })}

        {/* -- RACI grid ------------------------------------------------- */}
        {raciSections.some((s) => {
          const items = brief[s.key as keyof Brief] as string[] | undefined;
          return items && items.length > 0;
        }) && (
          <section class="detail-section">
            <h2 class="section-heading">RACI Matrix</h2>
            <div class="brief-detail__raci-grid">
              {raciSections.map((s) => {
                const items = brief[s.key as keyof Brief] as
                  | string[]
                  | undefined;
                return (
                  <div
                    key={s.key}
                    class="brief-detail__raci-cell"
                    data-raci={s.key}
                  >
                    <h3 class="brief-detail__raci-label">{s.label}</h3>
                    {items && items.length > 0
                      ? (
                        <ul class="brief-detail__list">
                          {items.map((item, i) => <li key={i}>{item}</li>)}
                        </ul>
                      )
                      : <p class="brief-detail__empty">None specified</p>}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* -- Meta ------------------------------------------------------- */}
        <div class="detail-section brief-detail__meta">
          <span>Created {formatDate(brief.createdAt)}</span>
          {brief.updatedAt && brief.updatedAt !== brief.createdAt && (
            <span>&middot; Updated {formatDate(brief.updatedAt)}</span>
          )}
        </div>
        <AuditMeta
          createdAt={brief.createdAt}
          updatedAt={brief.updatedAt}
          createdBy={brief.createdBy}
          updatedBy={brief.updatedBy}
        />
      </main>

      <div id="briefs-form-container" />
    </MainLayout>
  );
};
