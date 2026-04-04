import type { FC } from "hono/jsx";
import { MainLayout } from "../components/layout/main.tsx";
import { BackButton } from "./components/back-button.tsx";
import type { LeanCanvas } from "../types/lean-canvas.types.ts";
import { LEAN_CANVAS_SECTIONS } from "../types/lean-canvas.types.ts";
import type { ViewProps } from "../types/app.ts";
import { formatDate } from "../utils/time.ts";
import { DetailActions } from "./components/detail-actions.tsx";
import { SseRefresh } from "./components/sse-refresh.tsx";
import { InfoItem } from "./components/info-item.tsx";

// ---------------------------------------------------------------------------
// Section block
// ---------------------------------------------------------------------------

const SectionBlock: FC<{ label: string; items: string[] }> = (
  { label, items },
) => (
  <div class="lc-section">
    <h3 class="lc-section__title">{label}</h3>
    {items.length === 0
      ? <p class="lc-section__empty">Add items…</p>
      : (
        <ul class="lc-section__list">
          {items.map((item, i) => <li key={i}>{item}</li>)}
        </ul>
      )}
  </div>
);

// ---------------------------------------------------------------------------
// Main view
// ---------------------------------------------------------------------------

export const LeanCanvasDetailView: FC<ViewProps & { item: LeanCanvas }> = (
  { item: lc, ...viewProps },
) => {
  return (
    <MainLayout
      title={lc.title}
      {...viewProps}
      styles={["/css/views/lean-canvases.css"]}
    >
      <SseRefresh
        getUrl={"/lean-canvases/" + lc.id}
        trigger="sse:lean-canvas.updated"
        targetId="lc-detail-root"
      />
      <main id="lc-detail-root" class="detail-view lc-detail">
        <BackButton href="/lean-canvases" label="Back to Lean Canvases" />

        {/* -- Header ------------------------------------------------------- */}
        <header class="detail-section lc-detail__header">
          <div class="detail-title-row">
            <h1 class="detail-title">{lc.title}</h1>
            {lc.project && (
              <span class="badge badge--neutral">{lc.project}</span>
            )}
          </div>
          <DetailActions
            entity="lean-canvases"
            id={lc.id}
            title={lc.title}
            formContainerId="lean-canvases-form-container"
          />
        </header>

        {/* -- Info --------------------------------------------------------- */}
        <div class="detail-section detail-info-row">
          {lc.date && <InfoItem label="Date">{lc.date}</InfoItem>}
          <InfoItem label="Sections filled">
            {lc.completedSections}/12 ({lc.completionPct}%)
          </InfoItem>
        </div>

        {/* -- Canvas grid -------------------------------------------------- */}
        <div class="lc-canvas">
          {LEAN_CANVAS_SECTIONS.map((s) => (
            <div
              key={s.key}
              class={`lc-canvas__cell lc-canvas__cell--${s.key}`}
            >
              <SectionBlock
                label={s.label}
                items={lc[s.key as keyof LeanCanvas] as string[]}
              />
            </div>
          ))}
        </div>

        {/* -- Meta --------------------------------------------------------- */}
        <div class="detail-section lc-detail__meta">
          <span>Created {formatDate(lc.createdAt)}</span>
          {lc.updatedAt && lc.updatedAt !== lc.createdAt && (
            <span>&middot; Updated {formatDate(lc.updatedAt)}</span>
          )}
        </div>
      </main>

      <div id="lean-canvases-form-container" />
    </MainLayout>
  );
};
