import type { FC } from "hono/jsx";
import { MainLayout } from "../components/layout/main.tsx";
import { BackButton } from "./components/back-button.tsx";
import { Breadcrumb } from "../components/ui/breadcrumb.tsx";
import type { Brief } from "../types/brief.types.ts";
import { BRIEF_SECTIONS } from "../types/brief.types.ts";
import type { ViewProps } from "../types/app.ts";
import { DetailActions } from "./components/detail-actions.tsx";
import { ArchivedBanner } from "./components/archived-banner.tsx";
import { SseRefresh } from "./components/sse-refresh.tsx";
import { InfoItem } from "./components/info-item.tsx";
import { BRIEF_RACI_KEYS } from "../domains/brief/constants.ts";
import { AuditMeta } from "./components/audit-meta.tsx";
import { QuadrantEditGrid } from "./components/quadrant-edit-grid.tsx";
import { EditModeToggle } from "./components/edit-mode-toggle.tsx";

// ---------------------------------------------------------------------------
// Main view — sections are string[] arrays edited in place via the shared
// quadrant grid (read = list cards, Edit Mode = per-item add/edit/remove).
// ---------------------------------------------------------------------------

export const BriefDetailView: FC<
  ViewProps & { item: Brief; editing?: boolean }
> = (
  { item: brief, editing = false, ...viewProps },
) => {
  const raciSections = BRIEF_SECTIONS.filter((s) => BRIEF_RACI_KEYS.has(s.key));
  const otherSections = BRIEF_SECTIONS.filter((s) =>
    !BRIEF_RACI_KEYS.has(s.key)
  );
  const items = (key: string) =>
    (brief[key as keyof Brief] as string[] | undefined) ?? [];

  return (
    <MainLayout
      title={brief.title}
      {...viewProps}
      scripts={["/js/quadrant-edit.js"]}
    >
      <SseRefresh
        getUrl={"/briefs/" + brief.id + (editing ? "?editing=true" : "")}
        trigger="sse:brief.updated"
        targetId="brief-detail-root"
      />
      <main
        id="brief-detail-root"
        class={`detail-view brief-detail${
          editing ? " brief-detail--editing" : ""
        }`}
      >
        <Breadcrumb
          items={[
            { label: "Briefs", href: "/briefs" },
            { label: brief.title },
          ]}
        />
        <BackButton href="/briefs" label="Back to Briefs" />

        {/* -- Header ---------------------------------------------------- */}
        <header class="detail-section detail-header brief-detail__header">
          <div class="detail-title-row brief-detail__title-row">
            <h1 class="detail-title brief-detail__title">{brief.title}</h1>
          </div>
          <DetailActions
            entity="briefs"
            id={brief.id}
            title={brief.title}
            formContainerId="briefs-form-container"
            archived={brief.archived === true}
          >
            <EditModeToggle href={`/briefs/${brief.id}`} editing={editing} />
          </DetailActions>
        </header>

        <ArchivedBanner entity={brief} />

        {/* -- Info ------------------------------------------------------- */}
        {brief.date && (
          <div class="detail-section detail-info-row">
            <InfoItem label="Date">{brief.date}</InfoItem>
          </div>
        )}

        {/* -- General sections ------------------------------------------ */}
        <QuadrantEditGrid
          basePath="/briefs"
          id={brief.id}
          rootId="brief-detail-root"
          editing={editing}
          sections={otherSections.map((s) => ({
            key: s.key,
            label: s.label,
            items: items(s.key),
          }))}
        />

        {/* -- RACI matrix ----------------------------------------------- */}
        <section class="detail-section">
          <h2 class="section-heading">RACI Matrix</h2>
          <QuadrantEditGrid
            basePath="/briefs"
            id={brief.id}
            rootId="brief-detail-root"
            editing={editing}
            sections={raciSections.map((s) => ({
              key: s.key,
              label: s.label,
              items: items(s.key),
            }))}
          />
        </section>

        {/* -- Meta ------------------------------------------------------- */}
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
