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

const ParagraphBlock: FC<{ paragraph: NoteParagraph }> = ({ paragraph }) => {
  if (paragraph.type === "code") {
    return (
      <pre class="note-detail__code">
        <code class={paragraph.language ? `language-${paragraph.language}` : ""}>
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
        >
          {tab.content.map((p) => <ParagraphBlock key={p.id} paragraph={p} />)}
        </div>
      ))}
    </div>
  );
};

const TimelineSection: FC<{ section: CustomSection }> = ({ section }) => {
  const items = section.config.timeline ?? [];
  if (items.length === 0) return null;

  return (
    <div class="note-detail__timeline">
      {items.map((item) => (
        <div key={item.id} class="note-detail__timeline-item">
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
              <ParagraphBlock
                key={p.id}
                paragraph={p}
              />
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
    <div class="note-detail__split-view">
      {columns.map((col, i) => (
        <div key={i} class="note-detail__split-col">
          {col.map((p) => <ParagraphBlock key={p.id} paragraph={p} />)}
        </div>
      ))}
    </div>
  );
};

const SectionBlock: FC<{ section: CustomSection }> = ({ section }) => {
  return (
    <div class="note-detail__section-block">
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
      scripts={["/js/note-tabs.js"]}
    >
      <main class="note-detail">
        <div class="note-detail__back">
          <a href="/notes" class="btn btn--secondary">Back to notes</a>
        </div>

        <header class="note-detail__header">
          <h1 class="note-detail__title">{note.title}</h1>
          <div class="note-detail__meta">
            {note.project && (
              <span class="note-detail__project">{note.project}</span>
            )}
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
