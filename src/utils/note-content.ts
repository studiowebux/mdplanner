// Enhanced note-content parser + serializer — the markdown ⇄ structured
// (paragraphs + custom sections) transform used by NoteRepository. Pure and
// side-effect-free (aside from generated block IDs), so it lives here rather
// than inline in the repository and is unit-testable on its own.
//
// Custom section types: tabs, timeline, split-view. Section/tab/item ids are
// round-tripped through HTML comments (<!-- section-id / tab-id / item-id /
// column-index -->); top-level paragraph ids are NOT persisted and are
// regenerated on each parse.

import { generateId } from "./id.ts";
import type { CustomSection, NoteParagraph } from "../types/note.types.ts";

// ---------------------------------------------------------------------------
// Parse — markdown → { paragraphs, customSections }
// ---------------------------------------------------------------------------

/** Parse a note's enhanced markdown body into typed content blocks (text, embeds, mentions). Inverse of serializeEnhancedContent. */
export function parseEnhancedContent(
  content: string,
): { paragraphs: NoteParagraph[]; customSections: CustomSection[] } {
  const paragraphs: NoteParagraph[] = [];
  const customSections: CustomSection[] = [];
  const lines = content.split("\n");

  let currentParagraph: string[] = [];
  let inCodeBlock = false;
  let codeLanguage = "";
  let inCustomSection = false;
  let customSectionLines: string[] = [];
  let customSectionTitle = "";
  let customSectionId = "";
  let customSectionType: "tabs" | "timeline" | "split-view" = "tabs";
  let paragraphOrder = 0;
  let sectionOrder = 0;
  let globalOrder = 0;

  const flushParagraph = () => {
    if (currentParagraph.length > 0) {
      const text = currentParagraph.join("\n").trim();
      if (text) {
        paragraphs.push({
          id: `p_${Date.now()}_${paragraphOrder}`,
          type: "text",
          content: text,
          order: paragraphOrder++,
          globalOrder: globalOrder++,
        });
      }
      currentParagraph = [];
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Inside a custom section — pass lines through untouched
    // (section sub-parsers handle their own code fences)
    if (inCustomSection) {
      if (line.trim() === "<!-- End Custom Section -->") {
        customSections.push(
          parseCustomSection(
            customSectionId,
            customSectionTitle,
            customSectionType,
            customSectionLines.join("\n"),
            sectionOrder++,
            globalOrder++,
          ),
        );
        inCustomSection = false;
        customSectionLines = [];
      } else {
        customSectionLines.push(line);
      }
      continue;
    }

    // Code block handling (top-level only)
    if (line.startsWith("```")) {
      if (!inCodeBlock) {
        flushParagraph();
        inCodeBlock = true;
        codeLanguage = line.slice(3).trim();
      } else {
        paragraphs.push({
          id: `code_${Date.now()}_${paragraphOrder}`,
          type: "code",
          content: currentParagraph.join("\n"),
          language: codeLanguage || undefined,
          order: paragraphOrder++,
          globalOrder: globalOrder++,
        });
        currentParagraph = [];
        inCodeBlock = false;
        codeLanguage = "";
      }
      continue;
    }

    if (inCodeBlock) {
      currentParagraph.push(line);
      continue;
    }

    // Custom section start
    const sectionStartMatch = line.match(/^<!-- Custom Section: (.+) -->$/);
    if (sectionStartMatch) {
      flushParagraph();
      inCustomSection = true;
      customSectionTitle = sectionStartMatch[1];
      customSectionLines = [];

      const nextLine = lines[i + 1];
      if (nextLine?.startsWith("<!-- section-id:")) {
        const metaMatch = nextLine.match(
          /<!-- section-id: ([^,]+), type: ([^>]+) -->/,
        );
        if (metaMatch) {
          customSectionId = metaMatch[1];
          customSectionType = metaMatch[2] as typeof customSectionType;
          i++;
        }
      } else {
        customSectionId = `section_${Date.now()}_${sectionOrder}`;
      }
      continue;
    }

    currentParagraph.push(line);
  }

  flushParagraph();
  return { paragraphs, customSections };
}

// ---------------------------------------------------------------------------
// Custom section parsers (tabs, timeline, split-view)
// ---------------------------------------------------------------------------

function parseCustomSection(
  id: string,
  title: string,
  type: "tabs" | "timeline" | "split-view",
  content: string,
  order: number,
  globalOrder: number,
): CustomSection {
  const section: CustomSection = {
    id,
    type,
    title,
    order,
    globalOrder,
    config: {},
  };

  if (type === "tabs") {
    section.config.tabs = parseTabs(content);
  } else if (type === "timeline") {
    section.config.timeline = parseTimeline(content);
  } else if (type === "split-view") {
    section.config.splitView = parseSplitView(content);
  }

  return section;
}

function parseTabs(
  content: string,
): { id: string; title: string; content: NoteParagraph[] }[] {
  const tabs: { id: string; title: string; content: NoteParagraph[] }[] = [];
  const lines = content.split("\n");
  let current: typeof tabs[0] | null = null;
  let contentLines: string[] = [];

  const flush = () => {
    if (current) {
      current.content = parseContentBlocks(contentLines.join("\n"));
      tabs.push(current);
      contentLines = [];
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const tabMatch = line.match(/^### (?:Tab: )?(.+)$/);
    if (tabMatch) {
      flush();
      let tabId = generateId("tab");
      const nextLine = lines[i + 1];
      if (nextLine?.startsWith("<!-- tab-id:")) {
        const idMatch = nextLine.match(/<!-- tab-id: ([^>]+) -->/);
        if (idMatch) {
          tabId = idMatch[1].trim();
          i++;
        }
      }
      current = { id: tabId, title: tabMatch[1].trim(), content: [] };
      continue;
    }
    if (current) contentLines.push(line);
  }

  flush();
  return tabs;
}

function parseTimeline(content: string): {
  id: string;
  title: string;
  status: "success" | "failed" | "pending";
  date?: string;
  content: NoteParagraph[];
}[] {
  const items: ReturnType<typeof parseTimeline> = [];
  const lines = content.split("\n");
  let current: (typeof items)[0] | null = null;
  let contentLines: string[] = [];

  const flush = () => {
    if (current) {
      current.content = parseContentBlocks(contentLines.join("\n"));
      items.push(current);
      contentLines = [];
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(/^## (.+?) \((success|failed|pending)\)$/);
    if (match) {
      flush();
      let itemId = generateId("timeline");
      let date: string | undefined;

      const nextLine = lines[i + 1];
      if (nextLine?.startsWith("<!-- item-id:")) {
        const metaMatch = nextLine.match(
          /<!-- item-id: ([^,]+), status: [^,>]+(?:, date: ([^>]+))? -->/,
        );
        if (metaMatch) {
          itemId = metaMatch[1].trim();
          date = metaMatch[2]?.trim();
          i++;
        }
      }

      current = {
        id: itemId,
        title: match[1].trim(),
        status: match[2] as "success" | "failed" | "pending",
        date,
        content: [],
      };
      continue;
    }
    if (current) contentLines.push(line);
  }

  flush();
  return items;
}

function parseSplitView(
  content: string,
): { columns: NoteParagraph[][] } {
  const columns: NoteParagraph[][] = [];
  const lines = content.split("\n");
  let currentIdx = -1;
  let contentLines: string[] = [];

  const flush = () => {
    if (currentIdx >= 0) {
      columns[currentIdx] = parseContentBlocks(contentLines.join("\n"));
      contentLines = [];
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const colMatch = line.match(/^### Column (\d+)$/);
    if (colMatch) {
      flush();
      currentIdx = parseInt(colMatch[1], 10) - 1;
      while (columns.length <= currentIdx) columns.push([]);
      const nextLine = lines[i + 1];
      if (nextLine?.startsWith("<!-- column-index:")) i++;
      continue;
    }
    if (currentIdx >= 0) contentLines.push(line);
  }

  flush();
  while (columns.length < 2) columns.push([]);
  return { columns };
}

/** Parse markdown into NoteParagraph[] — handles text blocks and code fences. */
function parseContentBlocks(content: string): NoteParagraph[] {
  const blocks: NoteParagraph[] = [];
  const lines = content.split("\n");
  let currentBlock: string[] = [];
  let inCodeBlock = false;
  let codeLanguage = "";
  let order = 0;

  const flush = () => {
    const text = currentBlock.join("\n").trim();
    if (text) {
      blocks.push({
        id: generateId("block"),
        type: "text",
        content: text,
        order: order++,
      });
    }
    currentBlock = [];
  };

  for (const line of lines) {
    // Skip metadata comment lines (tab-id, column-index, item-id)
    if (/^<!--\s*(tab-id|column-index|item-id):/.test(line.trim())) continue;

    if (line.startsWith("```")) {
      if (!inCodeBlock) {
        flush();
        inCodeBlock = true;
        codeLanguage = line.slice(3).trim();
      } else {
        const codeContent = currentBlock.join("\n");
        if (codeContent.trim()) {
          blocks.push({
            id: generateId("code"),
            type: "code",
            content: codeContent,
            language: codeLanguage || undefined,
            order: order++,
          });
        }
        currentBlock = [];
        inCodeBlock = false;
        codeLanguage = "";
      }
      continue;
    }
    currentBlock.push(line);
  }

  flush();
  return blocks;
}

// ---------------------------------------------------------------------------
// Serialize — { paragraphs, customSections } → markdown
// ---------------------------------------------------------------------------

function serializeTabsSection(lines: string[], section: CustomSection): void {
  for (const tab of section.config.tabs ?? []) {
    lines.push(`### Tab: ${tab.title}`);
    lines.push(`<!-- tab-id: ${tab.id} -->`);
    lines.push("");
    for (const p of tab.content ?? []) serializeBlock(lines, p);
  }
}

function serializeTimelineSection(
  lines: string[],
  section: CustomSection,
): void {
  for (const item of section.config.timeline ?? []) {
    lines.push(`## ${item.title} (${item.status})`);
    lines.push(
      `<!-- item-id: ${item.id}, status: ${item.status}${
        item.date ? `, date: ${item.date}` : ""
      } -->`,
    );
    lines.push("");
    for (const p of item.content ?? []) serializeBlock(lines, p);
  }
}

function serializeSplitViewSection(
  lines: string[],
  section: CustomSection,
): void {
  const cols = section.config.splitView?.columns ?? [];
  cols.forEach((col, idx) => {
    lines.push(`### Column ${idx + 1}`);
    lines.push(`<!-- column-index: ${idx} -->`);
    lines.push("");
    for (const p of col) serializeBlock(lines, p);
  });
}

/** Serialize typed content blocks back to the note's enhanced markdown body. Inverse of parseEnhancedContent. */
export function serializeEnhancedContent(
  paragraphs: NoteParagraph[],
  customSections: CustomSection[],
): string {
  const lines: string[] = [];

  // Interleave paragraphs + sections by globalOrder
  type Block =
    | { kind: "paragraph"; item: NoteParagraph }
    | { kind: "section"; item: CustomSection };

  const blocks: (Block & { _order: number })[] = [
    ...paragraphs.map((p, i) => ({
      kind: "paragraph" as const,
      item: p,
      _order: p.globalOrder ?? i,
    })),
    ...customSections.map((s, i) => ({
      kind: "section" as const,
      item: s,
      _order: s.globalOrder ?? paragraphs.length + i,
    })),
  ].sort((a, b) => a._order - b._order);

  for (const block of blocks) {
    if (block.kind === "paragraph") {
      serializeBlock(lines, block.item);
      continue;
    }

    const section = block.item;
    lines.push(`<!-- Custom Section: ${section.title} -->`);
    lines.push(`<!-- section-id: ${section.id}, type: ${section.type} -->`);
    lines.push("");

    if (section.type === "tabs") serializeTabsSection(lines, section);
    else if (section.type === "timeline") {
      serializeTimelineSection(lines, section);
    } else if (section.type === "split-view") {
      serializeSplitViewSection(lines, section);
    }

    lines.push("<!-- End Custom Section -->");
    lines.push("");
  }

  return lines.join("\n").trim();
}

function serializeBlock(lines: string[], p: NoteParagraph): void {
  if (p.type === "code") {
    lines.push(`\`\`\`${p.language ?? ""}`);
    lines.push(p.content);
    lines.push("```");
  } else {
    lines.push(p.content);
  }
  lines.push("");
}
