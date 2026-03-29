// Note repository — reads and writes note markdown files from disk.
// Parses enhanced content (paragraphs + custom sections) from markdown.
// Pattern: Repository (same as milestone.repository.ts, task.repository.ts)

import { join } from "@std/path";
import {
  parseFrontmatter,
  serializeFrontmatter,
} from "../utils/frontmatter.ts";
import { generateId } from "../utils/id.ts";
import { findFileById, mergeFields } from "../utils/repo-helpers.ts";
import { atomicWrite, SafeWriter } from "../utils/safe-io.ts";
import { mapKeysToFm } from "../utils/frontmatter-mapper.ts";
import type {
  CreateNote,
  CustomSection,
  Note,
  NoteParagraph,
  UpdateNote,
} from "../types/note.types.ts";

// ---------------------------------------------------------------------------
// Repository
// ---------------------------------------------------------------------------

export class NoteRepository {
  private notesDir: string;
  private writer = new SafeWriter();

  constructor(projectDir: string) {
    this.notesDir = join(projectDir, "notes");
  }

  async findAll(): Promise<Note[]> {
    const notes: Note[] = [];
    try {
      for await (const entry of Deno.readDir(this.notesDir)) {
        if (!entry.isFile || !entry.name.endsWith(".md")) continue;
        const content = await Deno.readTextFile(
          join(this.notesDir, entry.name),
        );
        const note = this.parse(content);
        if (note) notes.push(note);
      }
    } catch (err) {
      if (!(err instanceof Deno.errors.NotFound)) throw err;
    }
    return notes;
  }

  async findById(id: string): Promise<Note | null> {
    const { entity } = await findFileById(
      this.notesDir,
      (c) => this.parse(c),
      id,
    );
    return entity;
  }

  async create(data: CreateNote): Promise<Note> {
    await Deno.mkdir(this.notesDir, { recursive: true });
    const id = generateId("note");
    const now = new Date().toISOString();

    const note: Note = {
      ...data,
      id,
      content: data.content ?? "",
      createdAt: now,
      updatedAt: now,
      revision: 1,
    };

    const filePath = join(this.notesDir, `${id}.md`);
    await this.writer.write(
      id,
      () => atomicWrite(filePath, this.serialize(note)),
    );

    return note;
  }

  async update(id: string, data: UpdateNote): Promise<Note | null> {
    const { file, entity: note } = await findFileById(
      this.notesDir,
      (c) => this.parse(c),
      id,
    );
    if (!file || !note) return null;

    const now = new Date().toISOString();
    const updated: Note = mergeFields(
      { ...note, updatedAt: now, revision: (note.revision ?? 1) + 1 },
      data as Record<string, unknown>,
    );

    await this.writer.write(
      id,
      () => atomicWrite(file, this.serialize(updated)),
    );

    return updated;
  }

  async delete(id: string): Promise<boolean> {
    const { file } = await findFileById(
      this.notesDir,
      (c) => this.parse(c),
      id,
    );
    if (!file) return false;
    await Deno.remove(file);
    return true;
  }

  // -------------------------------------------------------------------------
  // Parse — markdown → Note
  // -------------------------------------------------------------------------

  private parse(content: string): Note | null {
    const { frontmatter: fm, body } = parseFrontmatter(content);
    if (!fm.id) return null;

    // Title from first # heading
    const lines = body.split("\n");
    let title = "Untitled";
    let contentStartIndex = 0;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].startsWith("# ")) {
        title = lines[i].slice(2).trim();
        contentStartIndex = i + 1;
        break;
      }
    }

    const bodyContent = lines.slice(contentStartIndex).join("\n").trim();
    const { paragraphs, customSections } = this.parseEnhanced(bodyContent);

    return {
      id: String(fm.id),
      title,
      content: bodyContent,
      paragraphs,
      customSections,
      createdAt: String(fm.created_at ?? ""),
      updatedAt: String(fm.updated_at ?? ""),
      revision: Number(fm.revision ?? 1),
      project: fm.project != null ? String(fm.project) : undefined,
      createdBy: fm.created_by != null ? String(fm.created_by) : undefined,
      updatedBy: fm.updated_by != null ? String(fm.updated_by) : undefined,
    };
  }

  // -------------------------------------------------------------------------
  // Serialize — Note → markdown
  // -------------------------------------------------------------------------

  private serialize(note: Note): string {
    const fm: Record<string, unknown> = mapKeysToFm({
      id: note.id,
      createdAt: note.createdAt,
      updatedAt: note.updatedAt,
      revision: note.revision,
      mode: "enhanced",
      ...(note.project ? { project: note.project } : {}),
      ...(note.createdBy ? { createdBy: note.createdBy } : {}),
      ...(note.updatedBy ? { updatedBy: note.updatedBy } : {}),
    });

    let body = `# ${note.title}\n\n`;

    if (note.paragraphs?.length || note.customSections?.length) {
      body += this.serializeEnhanced(
        note.paragraphs ?? [],
        note.customSections ?? [],
      );
    } else if (note.content) {
      body += note.content;
    }

    return serializeFrontmatter(fm, body.trimEnd());
  }

  // -------------------------------------------------------------------------
  // Enhanced content parser
  // -------------------------------------------------------------------------

  private parseEnhanced(
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
            this.parseCustomSection(
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

  // -------------------------------------------------------------------------
  // Custom section parsers (tabs, timeline, split-view)
  // -------------------------------------------------------------------------

  private parseCustomSection(
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
      section.config.tabs = this.parseTabs(content);
    } else if (type === "timeline") {
      section.config.timeline = this.parseTimeline(content);
    } else if (type === "split-view") {
      section.config.splitView = this.parseSplitView(content);
    }

    return section;
  }

  private parseTabs(
    content: string,
  ): { id: string; title: string; content: NoteParagraph[] }[] {
    const tabs: { id: string; title: string; content: NoteParagraph[] }[] = [];
    const lines = content.split("\n");
    let current: typeof tabs[0] | null = null;
    let contentLines: string[] = [];

    const flush = () => {
      if (current) {
        current.content = this.parseContentBlocks(contentLines.join("\n"));
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

  private parseTimeline(content: string): {
    id: string;
    title: string;
    status: "success" | "failed" | "pending";
    date?: string;
    content: NoteParagraph[];
  }[] {
    const items: ReturnType<typeof this.parseTimeline> = [];
    const lines = content.split("\n");
    let current: (typeof items)[0] | null = null;
    let contentLines: string[] = [];

    const flush = () => {
      if (current) {
        current.content = this.parseContentBlocks(contentLines.join("\n"));
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

  private parseSplitView(
    content: string,
  ): { columns: NoteParagraph[][] } {
    const columns: NoteParagraph[][] = [];
    const lines = content.split("\n");
    let currentIdx = -1;
    let contentLines: string[] = [];

    const flush = () => {
      if (currentIdx >= 0) {
        columns[currentIdx] = this.parseContentBlocks(contentLines.join("\n"));
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
  private parseContentBlocks(content: string): NoteParagraph[] {
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

  // -------------------------------------------------------------------------
  // Enhanced content serializer
  // -------------------------------------------------------------------------

  private serializeEnhanced(
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
        this.serializeBlock(lines, block.item);
        continue;
      }

      const section = block.item;
      lines.push(`<!-- Custom Section: ${section.title} -->`);
      lines.push(
        `<!-- section-id: ${section.id}, type: ${section.type} -->`,
      );
      lines.push("");

      if (section.type === "tabs" && section.config.tabs) {
        for (const tab of section.config.tabs) {
          lines.push(`### Tab: ${tab.title}`);
          lines.push(`<!-- tab-id: ${tab.id} -->`);
          lines.push("");
          for (const p of tab.content ?? []) this.serializeBlock(lines, p);
        }
      } else if (section.type === "timeline" && section.config.timeline) {
        for (const item of section.config.timeline) {
          lines.push(`## ${item.title} (${item.status})`);
          lines.push(
            `<!-- item-id: ${item.id}, status: ${item.status}${
              item.date ? `, date: ${item.date}` : ""
            } -->`,
          );
          lines.push("");
          for (const p of item.content ?? []) this.serializeBlock(lines, p);
        }
      } else if (section.type === "split-view" && section.config.splitView) {
        const cols = section.config.splitView.columns ?? [];
        cols.forEach((col, idx) => {
          lines.push(`### Column ${idx + 1}`);
          lines.push(`<!-- column-index: ${idx} -->`);
          lines.push("");
          for (const p of col) this.serializeBlock(lines, p);
        });
      }

      lines.push("<!-- End Custom Section -->");
      lines.push("");
    }

    return lines.join("\n").trim();
  }

  private serializeBlock(lines: string[], p: NoteParagraph): void {
    if (p.type === "code") {
      lines.push(`\`\`\`${p.language ?? ""}`);
      lines.push(p.content);
      lines.push("```");
    } else {
      lines.push(p.content);
    }
    lines.push("");
  }
}
