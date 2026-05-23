import type { FC } from "hono/jsx";
import { MainLayout } from "../components/layout/main.tsx";
import { BackButton } from "./components/back-button.tsx";
import { Breadcrumb } from "../components/ui/breadcrumb.tsx";
import type { Retrospective } from "../types/retrospective.types.ts";
import { RETROSPECTIVE_SECTIONS } from "../types/retrospective.types.ts";
import type { ViewProps } from "../types/app.ts";
import { DetailActions } from "./components/detail-actions.tsx";
import { SseRefresh } from "./components/sse-refresh.tsx";
import { InfoItem } from "./components/info-item.tsx";
import { AuditMeta } from "./components/audit-meta.tsx";
import { QuadrantEditGrid } from "./components/quadrant-edit-grid.tsx";

// ---------------------------------------------------------------------------
// Main view
// ---------------------------------------------------------------------------

export const RetrospectiveDetailView: FC<
  ViewProps & {
    item: Retrospective;
    editing?: boolean;
    /** Name → person ID lookup for linking participants to People. */
    personByName?: Record<string, string>;
  }
> = (
  { item: retro, editing = false, personByName = {}, ...viewProps },
) => {
  return (
    <MainLayout
      title={retro.title}
      {...viewProps}
      styles={["/css/views/retrospectives.css"]}
      scripts={["/js/quadrant-edit.js"]}
    >
      <SseRefresh
        getUrl={"/retrospectives/" + retro.id +
          (editing ? "?editing=true" : "")}
        trigger="sse:retrospective.updated"
        targetId="retro-detail-root"
      />
      <main
        id="retro-detail-root"
        class={`detail-view retro-detail${
          editing ? " retro-detail--editing" : ""
        }`}
      >
        <Breadcrumb
          items={[
            { label: "Retrospectives", href: "/retrospectives" },
            { label: retro.title },
          ]}
        />
        <BackButton href="/retrospectives" label="Back to Retrospectives" />

        {/* -- Header ---------------------------------------------------- */}
        <header class="detail-section detail-header retro-detail__header">
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
          >
            {editing
              ? (
                <a
                  class="btn btn--secondary btn--sm"
                  href={`/retrospectives/${retro.id}`}
                >
                  Done Editing
                </a>
              )
              : (
                <a
                  class="btn btn--secondary btn--sm"
                  href={`/retrospectives/${retro.id}?editing=true`}
                >
                  Edit Items
                </a>
              )}
          </DetailActions>
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
              {retro.participants.map((p, i) => (
                <li key={i}>
                  {personByName[p]
                    ? (
                      <a href={`/people/${personByName[p]}`} class="badge">
                        {p}
                      </a>
                    )
                    : <span class="badge">{p}</span>}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* -- Sections -------------------------------------------------- */}
        <QuadrantEditGrid
          basePath="/retrospectives"
          id={retro.id}
          rootId="retro-detail-root"
          editing={editing}
          threeCol
          sections={RETROSPECTIVE_SECTIONS.map((s) => ({
            key: s.key,
            label: s.label,
            items: retro[s.key] as string[],
          }))}
        />

        {/* -- Meta ------------------------------------------------------- */}
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
