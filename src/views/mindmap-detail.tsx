import type { FC } from "hono/jsx";
import { MainLayout } from "../components/layout/main.tsx";
import { BackButton } from "./components/back-button.tsx";
import { Breadcrumb } from "../components/ui/breadcrumb.tsx";
import type { Mindmap } from "../types/mindmap.types.ts";
import type { ViewProps } from "../types/app.ts";
import { toKebab } from "../utils/slug.ts";
import { MarkdownSection } from "./components/markdown-section.tsx";
import { DetailActions } from "./components/detail-actions.tsx";
import { ArchivedBanner } from "./components/archived-banner.tsx";
import { SseRefresh } from "./components/sse-refresh.tsx";
import { AuditMeta } from "./components/audit-meta.tsx";
import { EditModeToggle } from "./components/edit-mode-toggle.tsx";
import { countAllNodes } from "../domains/mindmap/constants.tsx";
import { serializeBulletTree } from "../repositories/mindmap.repository.ts";

const NotesSection: FC<{ item: Mindmap }> = ({ item }) => (
  <section class="detail-section">
    <h2 class="section-heading">Notes</h2>
    <div
      class="inline-editable"
      contenteditable
      data-inline-edit
      data-inline-original={item.notes ?? ""}
      data-inline-target="mindmap-notes-value"
      data-inline-save-btn="mindmap-notes-save"
    >
      {item.notes ?? ""}
    </div>
    <input
      type="hidden"
      id="mindmap-notes-value"
      name="notes"
      value={item.notes ?? ""}
    />
    <div class="inline-editable__actions">
      <button
        type="button"
        id="mindmap-notes-save"
        class="btn btn--primary btn--sm is-hidden"
        hx-put={`/mindmaps/${item.id}/notes?editing=true`}
        hx-include="#mindmap-notes-value"
        hx-target="#mindmap-detail-root"
        hx-select="#mindmap-detail-root"
        hx-swap="outerHTML"
      >
        Save
      </button>
    </div>
  </section>
);

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
        ? [
          "/js/mindmap-layout.js",
          "/js/mindmap.js",
          "/js/mindmap-editor.js",
          "/js/inline-edit.js",
        ]
        : ["/js/mindmap-layout.js", "/js/mindmap.js"]}
    >
      <SseRefresh
        getUrl={`/mindmaps/${item.id}${editSuffix}`}
        trigger="sse:mindmap.updated"
        targetId="mindmap-detail-root"
      />
      <main
        id="mindmap-detail-root"
        class={`detail-view mindmap-detail${
          editing ? " mindmap-detail--editing" : ""
        }`}
      >
        <Breadcrumb
          items={[
            { label: "Mindmaps", href: "/mindmaps" },
            { label: item.title },
          ]}
        />
        <BackButton href="/mindmaps" label="Back to Mindmaps" />

        <header class="detail-section detail-header mindmap-detail__header">
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
            archived={item.archived === true}
          >
            <EditModeToggle href={`/mindmaps/${item.id}`} editing={editing} />
          </DetailActions>
        </header>

        <ArchivedBanner entity={item} />

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
              </div>

              <div
                id="mindmap-container"
                class="mindmap-detail__canvas"
                data-mindmap-id={item.id}
              />
            </>
          )}

        {editing
          ? <NotesSection item={item} />
          : <MarkdownSection title="Notes" markdown={item.notes} />}

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
