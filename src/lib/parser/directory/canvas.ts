/**
 * Directory-based parser for Canvas (Sticky Notes).
 * Each sticky note is stored as a separate markdown file.
 */
import { DirectoryParser, parseFrontmatter, buildFileContent } from "./base.ts";
import type { StickyNote } from "../../types.ts";

interface StickyNoteFrontmatter {
  id: string;
  color: "yellow" | "pink" | "blue" | "green" | "purple" | "orange";
  position: { x: number; y: number };
  size?: { width: number; height: number };
}

export class CanvasDirectoryParser extends DirectoryParser<StickyNote> {
  constructor(projectDir: string) {
    super({ projectDir, sectionName: "canvas" });
  }

  protected parseFile(content: string, _filePath: string): StickyNote | null {
    const { frontmatter, content: body } = parseFrontmatter<StickyNoteFrontmatter>(content);

    if (!frontmatter.id) {
      return null;
    }

    // Content is everything after the frontmatter (no title heading for sticky notes)
    const noteContent = body.trim();

    const stickyNote: StickyNote = {
      id: frontmatter.id,
      content: noteContent,
      color: frontmatter.color || "yellow",
      position: frontmatter.position || { x: 0, y: 0 },
    };

    if (frontmatter.size) {
      stickyNote.size = frontmatter.size;
    }

    return stickyNote;
  }

  protected serializeItem(stickyNote: StickyNote): string {
    const frontmatter: StickyNoteFrontmatter = {
      id: stickyNote.id,
      color: stickyNote.color,
      position: {
        x: Math.round(stickyNote.position.x),
        y: Math.round(stickyNote.position.y),
      },
    };

    if (stickyNote.size) {
      frontmatter.size = {
        width: Math.round(stickyNote.size.width),
        height: Math.round(stickyNote.size.height),
      };
    }

    // Sticky notes don't have a title heading, just content
    return buildFileContent(frontmatter, stickyNote.content);
  }

  /**
   * Add a new sticky note.
   */
  async add(
    content: string,
    color: StickyNote["color"],
    position: StickyNote["position"],
    size?: StickyNote["size"]
  ): Promise<StickyNote> {
    const stickyNote: StickyNote = {
      id: this.generateId("sticky"),
      content,
      color,
      position,
      size,
    };
    await this.write(stickyNote);
    return stickyNote;
  }

  /**
   * Update an existing sticky note.
   */
  async update(id: string, updates: Partial<StickyNote>): Promise<StickyNote | null> {
    const existing = await this.read(id);
    if (!existing) return null;

    const updated: StickyNote = {
      ...existing,
      ...updates,
      id: existing.id, // Prevent ID change
    };
    await this.write(updated);
    return updated;
  }

  /**
   * Update position of a sticky note (optimized for drag operations).
   */
  async updatePosition(
    id: string,
    position: { x: number; y: number }
  ): Promise<StickyNote | null> {
    return this.update(id, { position });
  }

  /**
   * Update size of a sticky note (optimized for resize operations).
   */
  async updateSize(
    id: string,
    size: { width: number; height: number }
  ): Promise<StickyNote | null> {
    return this.update(id, { size });
  }
}
