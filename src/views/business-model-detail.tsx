import type { FC } from "hono/jsx";
import { MainLayout } from "../components/layout/main.tsx";
import { BackButton } from "./components/back-button.tsx";
import { Breadcrumb } from "../components/ui/breadcrumb.tsx";
import type { BusinessModel } from "../types/business-model.types.ts";
import { BUSINESS_MODEL_SECTION_KEYS } from "../types/business-model.types.ts";
import type { ViewProps } from "../types/app.ts";
import { formatDate } from "../utils/time.ts";
import { toKebab } from "../utils/slug.ts";
import { MarkdownSection } from "./components/markdown-section.tsx";
import { DetailActions } from "./components/detail-actions.tsx";
import { EditModeToggle } from "./components/edit-mode-toggle.tsx";
import { InlineEditable } from "./components/inline-editable.tsx";
import { CanvasSectionBlock } from "./components/canvas-section-block.tsx";
import { ArchivedBanner } from "./components/archived-banner.tsx";
import { BUSINESS_MODEL_SECTION_META } from "../domains/business-model/constants.tsx";
import { SseRefresh } from "./components/sse-refresh.tsx";
import { InfoItem } from "./components/info-item.tsx";
import { AuditMeta } from "./components/audit-meta.tsx";

// ---------------------------------------------------------------------------
// Notes — read (markdown) or in-place editable (contenteditable + Save).
// ---------------------------------------------------------------------------

const NotesSection: FC<{ bmc: BusinessModel }> = ({ bmc }) => (
  <section class="detail-section">
    <h2 class="section-heading">Notes</h2>
    <InlineEditable
      fieldId="bmc-notes"
      name="notes"
      value={bmc.notes ?? ""}
      hxPut={`/business-models/${bmc.id}/notes?editing=true`}
      rootId="bmc-detail-root"
    />
  </section>
);

// ---------------------------------------------------------------------------
// Main view
// ---------------------------------------------------------------------------

export const BusinessModelDetailView: FC<
  ViewProps & { item: BusinessModel; editing?: boolean }
> = ({ item: bmc, editing = false, ...viewProps }) => {
  const editSuffix = editing ? "?editing=true" : "";

  return (
    <MainLayout
      title={bmc.title}
      {...viewProps}
      styles={["/css/views/lean-canvases.css", "/css/views/business-model.css"]}
      scripts={["/js/inline-edit.js", "/js/quadrant-edit.js"]}
    >
      <SseRefresh
        getUrl={"/business-models/" + bmc.id + editSuffix}
        trigger="sse:business-model.updated"
        targetId="bmc-detail-root"
      />
      <main
        id="bmc-detail-root"
        class={`detail-view bmc-detail${editing ? " bmc-detail--editing" : ""}`}
      >
        <Breadcrumb
          items={[
            { label: "Business Models", href: "/business-models" },
            { label: bmc.title },
          ]}
        />
        <BackButton href="/business-models" label="Back to Business Models" />

        {/* -- Header ------------------------------------------------------- */}
        <header class="detail-section detail-header bmc-detail__header">
          <div class="detail-title-row">
            <h1 class="detail-title">{bmc.title}</h1>
            <span class="badge badge--neutral">{formatDate(bmc.date)}</span>
          </div>
          <DetailActions
            entity="business-models"
            id={bmc.id}
            title={bmc.title}
            formContainerId="business-models-form-container"
            archived={bmc.archived === true}
          >
            <EditModeToggle
              href={`/business-models/${bmc.id}`}
              editing={editing}
            />
          </DetailActions>
        </header>

        <ArchivedBanner entity={bmc} />

        {/* -- Project ------------------------------------------------------- */}
        {bmc.project && (
          <div class="detail-section detail-info-row">
            <InfoItem label="Project">
              <a href={`/portfolio/${toKebab(bmc.project)}`}>{bmc.project}</a>
            </InfoItem>
          </div>
        )}

        {/* -- Canvas grid --------------------------------------------------- */}
        <div class="bmc-canvas">
          {BUSINESS_MODEL_SECTION_KEYS.map((key) => {
            const meta = BUSINESS_MODEL_SECTION_META[key];
            return (
              <div
                key={key}
                class={`lc-canvas__cell bmc-canvas__cell--${meta.gridArea}`}
              >
                <CanvasSectionBlock
                  basePath="/business-models"
                  rootId="bmc-detail-root"
                  id={bmc.id}
                  sectionKey={key}
                  label={meta.label}
                  items={bmc[key as keyof BusinessModel] as string[]}
                  editing={editing}
                  editSuffix={editSuffix}
                />
              </div>
            );
          })}
        </div>

        {/* -- Notes --------------------------------------------------------- */}
        {editing
          ? <NotesSection bmc={bmc} />
          : <MarkdownSection title="Notes" markdown={bmc.notes} />}

        <AuditMeta
          createdAt={bmc.createdAt}
          updatedAt={bmc.updatedAt}
          createdBy={bmc.createdBy}
          updatedBy={bmc.updatedBy}
        />
      </main>

      <div id="business-models-form-container" />
    </MainLayout>
  );
};
