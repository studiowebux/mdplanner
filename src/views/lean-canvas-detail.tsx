import type { FC } from "hono/jsx";
import { MainLayout } from "../components/layout/main.tsx";
import { BackButton } from "./components/back-button.tsx";
import { Breadcrumb } from "../components/ui/breadcrumb.tsx";
import type { LeanCanvas } from "../types/lean-canvas.types.ts";
import { LEAN_CANVAS_SECTIONS } from "../types/lean-canvas.types.ts";
import type { ViewProps } from "../types/app.ts";
import { DetailActions } from "./components/detail-actions.tsx";
import { EditModeToggle } from "./components/edit-mode-toggle.tsx";
import { ArchivedBanner } from "./components/archived-banner.tsx";
import { SseRefresh } from "./components/sse-refresh.tsx";
import { InfoItem } from "./components/info-item.tsx";
import { AuditMeta } from "./components/audit-meta.tsx";
import { CanvasSectionBlock } from "./components/canvas-section-block.tsx";

// ---------------------------------------------------------------------------
// Main view
// ---------------------------------------------------------------------------

export const LeanCanvasDetailView: FC<
  ViewProps & { item: LeanCanvas; editing?: boolean }
> = ({ item: lc, editing = false, ...viewProps }) => {
  const editSuffix = editing ? "?editing=true" : "";

  return (
    <MainLayout
      title={lc.title}
      {...viewProps}
      styles={["/css/views/lean-canvases.css"]}
      scripts={["/js/quadrant-edit.js"]}
    >
      <SseRefresh
        getUrl={"/lean-canvases/" + lc.id + editSuffix}
        trigger="sse:lean-canvas.updated"
        targetId="lc-detail-root"
      />
      <main
        id="lc-detail-root"
        class={`detail-view lc-detail${editing ? " lc-detail--editing" : ""}`}
      >
        <Breadcrumb
          items={[
            { label: "Lean Canvases", href: "/lean-canvases" },
            { label: lc.title },
          ]}
        />
        <BackButton href="/lean-canvases" label="Back to Lean Canvases" />

        {/* -- Header ------------------------------------------------------- */}
        <header class="detail-section detail-header lc-detail__header">
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
            archived={lc.archived === true}
          >
            <EditModeToggle
              href={`/lean-canvases/${lc.id}`}
              editing={editing}
            />
          </DetailActions>
        </header>

        <ArchivedBanner entity={lc} />

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
              <CanvasSectionBlock
                basePath="/lean-canvases"
                rootId="lc-detail-root"
                id={lc.id}
                sectionKey={s.key}
                label={s.label}
                items={lc[s.key as keyof LeanCanvas] as string[]}
                editing={editing}
                editSuffix={editSuffix}
              />
            </div>
          ))}
        </div>

        {/* -- Meta --------------------------------------------------------- */}
        <AuditMeta
          createdAt={lc.createdAt}
          updatedAt={lc.updatedAt}
          createdBy={lc.createdBy}
          updatedBy={lc.updatedBy}
        />
      </main>

      <div id="lean-canvases-form-container" />
    </MainLayout>
  );
};
