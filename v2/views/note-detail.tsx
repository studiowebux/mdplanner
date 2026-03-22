// Note detail view — renders enhanced content: paragraphs, code blocks,
// and custom sections (tabs, timeline, split-view) interleaved by globalOrder.

import type { FC } from "hono/jsx";
import { MainLayout } from "../components/layout/main.tsx";
import type {
  CustomSection,
  Note,
  NoteParagraph,
} from "../types/note.types.ts";
import type { ViewProps } from "../types/app.ts";
import { markdownToHtml } from "../utils/markdown.ts";
import { timeAgo } from "../utils/time.ts";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

type Props = ViewProps & { note: Note };

// ---------------------------------------------------------------------------
// Block types for interleaving
// ---------------------------------------------------------------------------

type Block =
  | { kind: "paragraph"; item: NoteParagraph; order: number }
  | { kind: "section"; item: CustomSection; order: number };

function interleaveBlocks(note: Note): Block[] {
  const blocks: Block[] = [];

  for (const [i, p] of (note.paragraphs ?? []).entries()) {
    blocks.push({ kind: "paragraph", item: p, order: p.globalOrder ?? i });
  }
  for (const [i, s] of (note.customSections ?? []).entries()) {
    blocks.push({
      kind: "section",
      item: s,
      order: s.globalOrder ?? (note.paragraphs?.length ?? 0) + i,
    });
  }

  return blocks.sort((a, b) => a.order - b.order);
}

// ---------------------------------------------------------------------------
// Paragraph renderer
// ---------------------------------------------------------------------------

const ParagraphBlock: FC<{
  paragraph: NoteParagraph;
  sub?: boolean;
}> = ({ paragraph, sub }) => {
  const idAttr = sub
    ? { "data-sub-block-id": paragraph.id }
    : { "data-block-id": paragraph.id };

  if (paragraph.type === "code") {
    return (
      <pre
        class="note-detail__code"
        {...idAttr}
        data-block-type="code"
        data-block-content={paragraph.content}
        data-block-lang={paragraph.language ?? ""}
      >
        <code
          class={paragraph.language ? `language-${paragraph.language}` : ""}
        >
          {paragraph.content}
        </code>
      </pre>
    );
  }

  const html = markdownToHtml(paragraph.content);
  if (!html) return null;

  return (
    <div
      class="note-detail__paragraph markdown-body"
      {...idAttr}
      data-block-type="text"
      data-block-content={paragraph.content}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};

// ---------------------------------------------------------------------------
// Custom section renderers
// ---------------------------------------------------------------------------

const TabsSection: FC<{ section: CustomSection }> = ({ section }) => {
  const tabs = section.config.tabs ?? [];
  if (tabs.length === 0) return null;

  return (
    <div class="note-detail__tabs" data-note-tabs>
      <div class="note-detail__tab-bar" role="tablist">
        {tabs.map((tab, i) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            class={`note-detail__tab-btn${
              i === 0 ? " note-detail__tab-btn--active" : ""
            }`}
            data-tab-id={tab.id}
            data-tab-title={tab.title}
            aria-selected={i === 0 ? "true" : "false"}
          >
            {tab.title}
          </button>
        ))}
      </div>
      {tabs.map((tab, i) => (
        <div
          key={tab.id}
          role="tabpanel"
          class={`note-detail__tab-panel${i === 0 ? "" : " is-hidden"}`}
          data-tab-panel={tab.id}
          data-tab-panel-title={tab.title}
        >
          {tab.content.map((p) => (
            <ParagraphBlock key={p.id} paragraph={p} sub />
          ))}
        </div>
      ))}
    </div>
  );
};

const TimelineSection: FC<{ section: CustomSection }> = ({ section }) => {
  const items = section.config.timeline ?? [];
  if (items.length === 0) return null;

  return (
    <div class="note-detail__timeline" data-timeline-container>
      {items.map((item) => (
        <div
          key={item.id}
          class="note-detail__timeline-item"
          data-timeline-item-id={item.id}
          data-timeline-title={item.title}
          data-timeline-status={item.status}
          data-timeline-date={item.date ?? ""}
        >
          <div
            class={`note-detail__timeline-dot note-detail__timeline-dot--${item.status}`}
          />
          <div class="note-detail__timeline-content">
            <div class="note-detail__timeline-header">
              <span class="note-detail__timeline-title">{item.title}</span>
              <span
                class={`note-detail__timeline-status note-detail__timeline-status--${item.status}`}
              >
                {item.status}
              </span>
              {item.date && (
                <span class="note-detail__timeline-date">{item.date}</span>
              )}
            </div>
            {item.content.map((p) => (
              <ParagraphBlock key={p.id} paragraph={p} sub />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

const SplitViewSection: FC<{ section: CustomSection }> = ({ section }) => {
  const columns = section.config.splitView?.columns ?? [];
  if (columns.length === 0) return null;

  return (
    <div class="note-detail__split-view" data-split-container>
      {columns.map((col, i) => (
        <div
          key={i}
          class="note-detail__split-col"
          data-column-index={String(i)}
        >
          {col.map((p) => <ParagraphBlock key={p.id} paragraph={p} sub />)}
        </div>
      ))}
    </div>
  );
};

const SectionBlock: FC<{ section: CustomSection }> = ({ section }) => {
  return (
    <div
      class="note-detail__section-block"
      data-section-id={section.id}
      data-section-type={section.type}
      data-section-title={section.title}
    >
      <h3 class="note-detail__section-title">{section.title}</h3>
      {section.type === "tabs" && <TabsSection section={section} />}
      {section.type === "timeline" && <TimelineSection section={section} />}
      {section.type === "split-view" && <SplitViewSection section={section} />}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Main view
// ---------------------------------------------------------------------------

export const NoteDetailView: FC<Props> = (props) => {
  const { note, ...layoutProps } = props;
  const blocks = interleaveBlocks(note);

  return (
    <MainLayout
      {...layoutProps}
      title={note.title}
      activePath="/notes"
      styles={["/css/views/note.css"]}
      scripts={["/js/note-tabs.js", "/js/note-editor.js"]}
    >
      <main class="note-detail" id="note-detail-root" data-note-id={note.id}>
        <div class="note-detail__top-bar">
          <a href="/notes" class="btn btn--secondary">Back to notes</a>
          <button
            type="button"
            class="btn btn--secondary"
            data-note-edit-toggle
          >
            Edit
          </button>
        </div>

        <header class="note-detail__header" id="note-detail-header">
          <div class="note-detail__title-row">
            <input
              type="text"
              class="note-detail__title-input"
              name="title"
              value={note.title}
              hx-post={`/notes/${note.id}/title`}
              hx-trigger="change"
              hx-target="#note-detail-root"
              hx-select="#note-detail-root"
              hx-swap="outerHTML"
              hx-include="this"
            />
          </div>
          <div class="note-detail__meta">
            <div class="note-detail__action-group">
              <label class="note-detail__action-label">Project</label>
              <div class="form__autocomplete">
                <input
                  type="text"
                  class="form__input"
                  placeholder="Search projects..."
                  value={note.project ?? ""}
                  autocomplete="off"
                  name="q"
                  data-autocomplete-target="note-project-hidden"
                  data-freetext="true"
                  hx-get="/autocomplete/portfolio"
                  hx-trigger="input changed delay:150ms, focus"
                  hx-target="#note-project-results"
                  hx-include="this"
                  hx-swap="innerHTML"
                />
                <input
                  type="hidden"
                  id="note-project-hidden"
                  name="project"
                  value={note.project ?? ""}
                  hx-post={`/notes/${note.id}/project`}
                  hx-target="#note-detail-root"
                  hx-select="#note-detail-root"
                  hx-swap="outerHTML"
                  hx-trigger="input"
                  hx-include="this"
                />
                <ul class="form__autocomplete-list" id="note-project-results" />
              </div>
            </div>
            <span class="note-detail__updated">
              Updated {timeAgo(note.updatedAt)}
            </span>
          </div>
        </header>

        <div class="note-detail__body">
          {blocks.map((block) => {
            if (block.kind === "paragraph") {
              return (
                <ParagraphBlock
                  key={block.item.id}
                  paragraph={block.item}
                />
              );
            }
            return <SectionBlock key={block.item.id} section={block.item} />;
          })}
        </div>
      </main>
    </MainLayout>
  );
};
