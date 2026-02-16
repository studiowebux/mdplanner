/**
 * Directory-based parser for Notes.
 * Each note is stored as a separate markdown file.
 */
import { DirectoryParser, parseFrontmatter, buildFileContent } from "./base.ts";
import type { Note, NoteParagraph, CustomSection } from "../../types.ts";

interface NoteFrontmatter {
  id: string;
  created: string;
  updated: string;
  revision: number;
  mode?: "simple" | "enhanced";
}

export class NotesDirectoryParser extends DirectoryParser<Note> {
  constructor(projectDir: string) {
    super({ projectDir, sectionName: "notes" });
  }

  protected parseFile(content: string, _filePath: string): Note | null {
    const { frontmatter, content: body } = parseFrontmatter<NoteFrontmatter>(content);

    if (!frontmatter.id) {
      return null;
    }

    // Extract title from first heading
    const lines = body.split("\n");
    let title = "Untitled";
    let contentStartIndex = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.startsWith("# ")) {
        title = line.slice(2).trim();
        contentStartIndex = i + 1;
        break;
      }
    }

    const bodyContent = lines.slice(contentStartIndex).join("\n").trim();

    // Check if enhanced mode (has custom sections or paragraphs)
    const isEnhanced = frontmatter.mode === "enhanced" ||
      bodyContent.includes("<!-- Custom Section:");

    if (isEnhanced) {
      const { paragraphs, customSections } = this.parseEnhancedContent(bodyContent);
      return {
        id: frontmatter.id,
        title,
        content: bodyContent,
        paragraphs,
        customSections,
        createdAt: frontmatter.created || new Date().toISOString(),
        updatedAt: frontmatter.updated || new Date().toISOString(),
        revision: frontmatter.revision || 1,
        mode: "enhanced",
      };
    }

    return {
      id: frontmatter.id,
      title,
      content: bodyContent,
      createdAt: frontmatter.created || new Date().toISOString(),
      updatedAt: frontmatter.updated || new Date().toISOString(),
      revision: frontmatter.revision || 1,
      mode: "simple",
    };
  }

  protected serializeItem(note: Note): string {
    const frontmatter: NoteFrontmatter = {
      id: note.id,
      created: note.createdAt,
      updated: note.updatedAt,
      revision: note.revision,
      mode: note.mode,
    };

    let body = `# ${note.title}\n\n`;

    if (note.mode === "enhanced" && (note.paragraphs?.length || note.customSections?.length)) {
      body += this.serializeEnhancedContent(note.paragraphs || [], note.customSections || []);
    } else if (note.content) {
      body += note.content;
    }

    return buildFileContent(frontmatter, body);
  }

  /**
   * Parse enhanced note content with paragraphs and custom sections.
   */
  private parseEnhancedContent(
    content: string
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

    const flushParagraph = () => {
      if (currentParagraph.length > 0) {
        const text = currentParagraph.join("\n").trim();
        if (text) {
          paragraphs.push({
            id: `p_${Date.now()}_${paragraphOrder}`,
            type: "text",
            content: text,
            order: paragraphOrder++,
          });
        }
        currentParagraph = [];
      }
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Code block handling
      if (line.startsWith("```")) {
        if (!inCodeBlock) {
          flushParagraph();
          inCodeBlock = true;
          codeLanguage = line.slice(3).trim();
        } else {
          const codeContent = currentParagraph.join("\n");
          paragraphs.push({
            id: `code_${Date.now()}_${paragraphOrder}`,
            type: "code",
            content: codeContent,
            language: codeLanguage || undefined,
            order: paragraphOrder++,
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

        // Check next line for section metadata
        const nextLine = lines[i + 1];
        if (nextLine?.startsWith("<!-- section-id:")) {
          const metaMatch = nextLine.match(
            /<!-- section-id: ([^,]+), type: ([^>]+) -->/
          );
          if (metaMatch) {
            customSectionId = metaMatch[1];
            customSectionType = metaMatch[2] as typeof customSectionType;
            i++; // Skip metadata line
          }
        } else {
          customSectionId = `section_${Date.now()}_${sectionOrder}`;
        }
        continue;
      }

      // Custom section end
      if (line.trim() === "<!-- End Custom Section -->") {
        if (inCustomSection) {
          customSections.push(
            this.parseCustomSection(
              customSectionId,
              customSectionTitle,
              customSectionType,
              customSectionLines.join("\n"),
              sectionOrder++
            )
          );
          inCustomSection = false;
          customSectionLines = [];
        }
        continue;
      }

      if (inCustomSection) {
        customSectionLines.push(line);
        continue;
      }

      // Regular content
      currentParagraph.push(line);
    }

    flushParagraph();

    return { paragraphs, customSections };
  }

  /**
   * Parse a single custom section.
   */
  private parseCustomSection(
    id: string,
    title: string,
    type: "tabs" | "timeline" | "split-view",
    content: string,
    order: number
  ): CustomSection {
    const section: CustomSection = {
      id,
      type,
      title,
      order,
      config: {},
    };

    if (type === "split-view") {
      section.config.splitView = this.parseSplitView(content);
    } else if (type === "tabs") {
      section.config.tabs = this.parseTabs(content);
    } else if (type === "timeline") {
      section.config.timeline = this.parseTimeline(content);
    }

    return section;
  }

  /**
   * Parse split-view content into columns.
   */
  private parseSplitView(content: string): { columns: NoteParagraph[][] } {
    const columns: NoteParagraph[][] = [];
    const lines = content.split("\n");
    let currentColumnIdx = -1;
    let contentLines: string[] = [];

    const flushColumn = () => {
      if (currentColumnIdx >= 0) {
        columns[currentColumnIdx] = this.parseContentBlocks(contentLines.join("\n"));
        contentLines = [];
      }
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const columnMatch = line.match(/^### Column (\d+)$/);
      if (columnMatch) {
        flushColumn();
        currentColumnIdx = parseInt(columnMatch[1], 10) - 1;
        // Ensure columns array is large enough
        while (columns.length <= currentColumnIdx) {
          columns.push([]);
        }
        // Skip column-index comment if present
        const nextLine = lines[i + 1];
        if (nextLine?.startsWith("<!-- column-index:")) {
          i++;
        }
        continue;
      }

      if (currentColumnIdx >= 0) {
        contentLines.push(line);
      }
    }

    flushColumn();
    // Ensure at least 2 columns
    while (columns.length < 2) {
      columns.push([]);
    }
    return { columns };
  }

  /**
   * Parse tabs content.
   */
  private parseTabs(
    content: string
  ): { id: string; title: string; content: NoteParagraph[] }[] {
    const tabs: { id: string; title: string; content: NoteParagraph[] }[] = [];
    const lines = content.split("\n");
    let currentTab: { id: string; title: string; content: NoteParagraph[] } | null = null;
    let contentLines: string[] = [];

    const flushTab = () => {
      if (currentTab) {
        currentTab.content = this.parseContentBlocks(contentLines.join("\n"));
        tabs.push(currentTab);
        contentLines = [];
      }
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Match ### Tab: Title or ### Title (legacy)
      const tabMatch = line.match(/^### (?:Tab: )?(.+)$/);
      if (tabMatch) {
        flushTab();
        let tabId = `tab_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        // Check next line for tab-id comment
        const nextLine = lines[i + 1];
        if (nextLine?.startsWith("<!-- tab-id:")) {
          const idMatch = nextLine.match(/<!-- tab-id: ([^>]+) -->/);
          if (idMatch) {
            tabId = idMatch[1].trim();
            i++; // Skip the metadata line
          }
        }
        currentTab = {
          id: tabId,
          title: tabMatch[1].trim(),
          content: [],
        };
        continue;
      }

      if (currentTab) {
        contentLines.push(line);
      }
    }

    flushTab();
    return tabs;
  }

  /**
   * Parse content blocks from markdown, handling code fences.
   */
  private parseContentBlocks(content: string): NoteParagraph[] {
    const blocks: NoteParagraph[] = [];
    const lines = content.split("\n");
    let currentBlock: string[] = [];
    let inCodeBlock = false;
    let codeLanguage = "";
    let order = 0;

    const flushBlock = () => {
      const text = currentBlock.join("\n").trim();
      if (text) {
        blocks.push({
          id: `block_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          type: "text",
          content: text,
          order: order++,
        });
      }
      currentBlock = [];
    };

    for (const line of lines) {
      if (line.startsWith("```")) {
        if (!inCodeBlock) {
          flushBlock();
          inCodeBlock = true;
          codeLanguage = line.slice(3).trim();
        } else {
          const codeContent = currentBlock.join("\n");
          if (codeContent.trim()) {
            blocks.push({
              id: `code_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
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

    flushBlock();
    return blocks;
  }

  /**
   * Parse timeline content.
   */
  private parseTimeline(
    content: string
  ): { id: string; title: string; status: "success" | "failed" | "pending"; date?: string; content: NoteParagraph[] }[] {
    const items: { id: string; title: string; status: "success" | "failed" | "pending"; date?: string; content: NoteParagraph[] }[] = [];
    const lines = content.split("\n");
    let currentItem: typeof items[0] | null = null;
    let contentLines: string[] = [];

    const flushItem = () => {
      if (currentItem) {
        currentItem.content = this.parseContentBlocks(contentLines.join("\n"));
        items.push(currentItem);
        contentLines = [];
      }
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Match ## Title (status) or ### Title {status: ...} (legacy)
      const newFormatMatch = line.match(/^## (.+?) \((success|failed|pending)\)$/);
      const legacyMatch = line.match(/^### (.+?)(?:\s*\{(.+)\})?$/);

      if (newFormatMatch) {
        flushItem();
        let itemId = `timeline_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        let date: string | undefined;

        // Check next line for item-id comment
        const nextLine = lines[i + 1];
        if (nextLine?.startsWith("<!-- item-id:")) {
          const metaMatch = nextLine.match(/<!-- item-id: ([^,]+), status: [^,>]+(?:, date: ([^>]+))? -->/);
          if (metaMatch) {
            itemId = metaMatch[1].trim();
            date = metaMatch[2]?.trim();
            i++; // Skip metadata line
          }
        }

        currentItem = {
          id: itemId,
          title: newFormatMatch[1].trim(),
          status: newFormatMatch[2] as "success" | "failed" | "pending",
          date,
          content: [],
        };
        continue;
      } else if (legacyMatch) {
        flushItem();
        const title = legacyMatch[1].trim();
        const configStr = legacyMatch[2] || "";
        let status: "success" | "failed" | "pending" = "pending";
        let date: string | undefined;

        for (const part of configStr.split(";")) {
          const [key, value] = part.split(":").map((s) => s.trim());
          if (key === "status") {
            status = value as typeof status;
          } else if (key === "date") {
            date = value;
          }
        }

        currentItem = {
          id: `timeline_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          title,
          status,
          date,
          content: [],
        };
        continue;
      }

      if (currentItem) {
        contentLines.push(line);
      }
    }

    flushItem();
    return items;
  }

  /**
   * Serialize enhanced content to markdown.
   */
  private serializeEnhancedContent(
    paragraphs: NoteParagraph[],
    customSections: CustomSection[]
  ): string {
    const lines: string[] = [];

    // Sort by order
    const sortedParagraphs = [...paragraphs].sort((a, b) => a.order - b.order);
    const sortedSections = [...customSections].sort((a, b) => a.order - b.order);

    // Serialize paragraphs
    for (const p of sortedParagraphs) {
      if (p.type === "code") {
        lines.push(`\`\`\`${p.language || ""}`);
        lines.push(p.content);
        lines.push("```");
      } else {
        lines.push(p.content);
      }
      lines.push("");
    }

    // Serialize custom sections
    for (const section of sortedSections) {
      lines.push(`<!-- Custom Section: ${section.title} -->`);
      lines.push(`<!-- section-id: ${section.id}, type: ${section.type} -->`);
      lines.push("");

      if (section.type === "split-view" && section.config.splitView) {
        const columns = section.config.splitView.columns || [];
        columns.forEach((column, idx) => {
          lines.push(`### Column ${idx + 1}`);
          lines.push(`<!-- column-index: ${idx} -->`);
          lines.push("");
          for (const p of column) {
            this.serializeContentBlock(lines, p);
          }
        });
      } else if (section.type === "tabs" && section.config.tabs) {
        for (const tab of section.config.tabs) {
          lines.push(`### Tab: ${tab.title}`);
          lines.push(`<!-- tab-id: ${tab.id} -->`);
          lines.push("");
          for (const p of tab.content || []) {
            this.serializeContentBlock(lines, p);
          }
        }
      } else if (section.type === "timeline" && section.config.timeline) {
        for (const item of section.config.timeline) {
          lines.push(`## ${item.title} (${item.status})`);
          lines.push(`<!-- item-id: ${item.id}, status: ${item.status}${item.date ? `, date: ${item.date}` : ""} -->`);
          lines.push("");
          for (const p of item.content || []) {
            this.serializeContentBlock(lines, p);
          }
        }
      }

      lines.push("<!-- End Custom Section -->");
      lines.push("");
    }

    return lines.join("\n").trim();
  }

  /**
   * Serialize a content block (paragraph) with proper code fencing.
   */
  private serializeContentBlock(lines: string[], p: NoteParagraph): void {
    if (p.type === "code") {
      lines.push(`\`\`\`${p.language || ""}`);
      lines.push(p.content);
      lines.push("```");
    } else {
      lines.push(p.content);
    }
    lines.push("");
  }

  /**
   * Add a new note.
   */
  async add(note: Omit<Note, "id" | "createdAt" | "updatedAt" | "revision">): Promise<Note> {
    const now = new Date().toISOString();
    const newNote: Note = {
      ...note,
      id: this.generateId("note"),
      createdAt: now,
      updatedAt: now,
      revision: 1,
    };
    await this.write(newNote);
    return newNote;
  }

  /**
   * Update an existing note.
   */
  async update(id: string, updates: Partial<Note>): Promise<Note | null> {
    const existing = await this.read(id);
    if (!existing) return null;

    const updated: Note = {
      ...existing,
      ...updates,
      id: existing.id, // Prevent ID change
      updatedAt: new Date().toISOString(),
      revision: existing.revision + 1,
    };

    await this.write(updated);
    return updated;
  }
}
