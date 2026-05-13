import type { FC } from "hono/jsx";
import { MainLayout } from "../components/layout/main.tsx";
import { BackButton } from "./components/back-button.tsx";
import type { Mindmap } from "../types/mindmap.types.ts";
import type { ViewProps } from "../types/app.ts";
import { toKebab } from "../utils/slug.ts";
import { MarkdownSection } from "./components/markdown-section.tsx";
import { DetailActions } from "./components/detail-actions.tsx";
import { SseRefresh } from "./components/sse-refresh.tsx";
import { AuditMeta } from "./components/audit-meta.tsx";
import { countAllNodes } from "../domains/mindmap/constants.tsx";
import { serializeBulletTree } from "../repositories/mindmap.repository.ts";

export const MindmapDetailView: FC<
  ViewProps & { item: Mindmap; editing?: boolean; rawBody?: string }
> = ({ item, editing = false, rawBody, ...viewProps }) => {
  const editSuffix = editing ? "?editing=true" : "";
  const nodeCount = countAllNodes(item.nodes);
  const bodyText = rawBody ?? serializeBulletTree(item.nodes);

  return (
    <MainLayout
      title={item.title}
      {...viewProps}
      styles={["/css/views/mindmaps.css"]}
      scripts={editing
        ? ["/js/mindmap.js", "/js/mindmap-editor.js"]
        : ["/js/mindmap.js", "/js/fullscreen-reading.js"]}
    >
      <SseRefresh
        getUrl={`/mindmaps/${item.id}${editSuffix}`}
        trigger="sse:mindmap.updated"
        targetId="mindmap-detail-root"
      />
      <main id="mindmap-detail-root" class="detail-view mindmap-detail">
        <BackButton href="/mindmaps" label="Back to Mindmaps" />

        <header class="detail-section mindmap-detail__header">
          <div class="detail-title-row">
            <h1 class="detail-title">{item.title}</h1>
            <a
              class="badge"
              href={`/portfolio/${toKebab(item.project)}`}
            >
              {item.project}
            </a>
            <span class="badge">{nodeCount} nodes</span>
          </div>
          <DetailActions
            entity="mindmaps"
            id={item.id}
            title={item.title}
            formContainerId="mindmaps-form-container"
          />
        </header>

        {editing
          ? (
            <form
              class="mindmap-edit-form"
              hx-post={`/mindmaps/${item.id}/body`}
              hx-target="#mindmap-detail-root"
              hx-select="#mindmap-detail-root"
              hx-swap="outerHTML"
            >
              <textarea
                class="form__textarea mindmap-edit-form__textarea"
                name="body"
                rows={20}
                spellcheck={false}
              >
                {bodyText}
              </textarea>
              <div class="mindmap-edit-form__actions">
                <button type="submit" class="btn btn--primary">Save</button>
                <a
                  class="btn btn--secondary"
                  href={`/mindmaps/${item.id}`}
                >
                  Cancel
                </a>
              </div>
            </form>
          )
          : (
            <>
              <div class="mindmap-detail__toolbar">
                <button
                  id="mindmap-zoom-out"
                  type="button"
                  class="btn btn--secondary btn--sm"
                >
                  Zoom out
                </button>
                <button
                  id="mindmap-fit"
                  type="button"
                  class="btn btn--secondary btn--sm"
                >
                  Fit
                </button>
                <button
                  id="mindmap-zoom-in"
                  type="button"
                  class="btn btn--secondary btn--sm"
                >
                  Zoom in
                </button>
                <a
                  class="btn btn--secondary btn--sm mindmap-detail__toolbar-end"
                  href={`/mindmaps/${item.id}?editing=true`}
                >
                  Edit
                </a>
                <button
                  type="button"
                  class="btn btn--secondary btn--sm"
                  data-fullscreen-toggle
                >
                  Focus
                </button>
              </div>

              <div
                id="mindmap-container"
                class="mindmap-detail__canvas"
                data-mindmap-id={item.id}
              />
            </>
          )}

        <MarkdownSection title="Notes" markdown={item.notes} />

        <AuditMeta
          createdAt={item.createdAt}
          updatedAt={item.updatedAt}
          createdBy={item.createdBy}
          updatedBy={item.updatedBy}
        />
      </main>

      <div id="mindmaps-form-container" />
    </MainLayout>
  );
};
