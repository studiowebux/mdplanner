// Sticky Note repository — markdown file CRUD under sticky-notes/.

import type {
  CreateStickyNote,
  StickyNote,
  UpdatePosition,
  UpdateSize,
  UpdateStickyNote,
} from "../types/sticky-note.types.ts";
import { CachedMarkdownRepository } from "./cached.repository.ts";
import {
  rowToStickyNote,
  STICKY_NOTE_TABLE,
} from "../domains/sticky-note/cache.ts";
import { STICKY_NOTE_BODY_KEYS } from "../domains/sticky-note/constants.ts";

export class StickyNoteRepository extends CachedMarkdownRepository<
  StickyNote,
  CreateStickyNote,
  UpdateStickyNote
> {
  protected readonly tableName = STICKY_NOTE_TABLE;
  private readonly boardId: string;

  constructor(projectDir: string, boardId = "default") {
    super(projectDir, {
      directory: `sticky-notes/${boardId}`,
      idPrefix: "sticky",
      nameField: "content",
    });
    this.boardId = boardId;
  }

  protected rowToEntity(row: Record<string, unknown>): StickyNote {
    return rowToStickyNote(row);
  }

  async updatePosition(
    id: string,
    position: UpdatePosition,
  ): Promise<StickyNote | null> {
    return this.update(id, { position });
  }

  async updateSize(id: string, size: UpdateSize): Promise<StickyNote | null> {
    return this.update(id, { size });
  }

  protected fromCreateInput(
    data: CreateStickyNote,
    id: string,
    now: string,
  ): StickyNote {
    return {
      ...data,
      id,
      color: data.color ?? "yellow",
      position: data.position ?? { x: 100, y: 100 },
      boardId: this.boardId,
      createdAt: now,
      updatedAt: now,
    };
  }

  protected parse(
    filename: string,
    fm: Record<string, unknown>,
    body: string,
  ): StickyNote | null {
    if (!fm.color) return null;
    const id = filename.replace(/\.md$/, "");
    const pos = fm.position as { x: number; y: number } | undefined;
    const sz = fm.size as { width: number; height: number } | undefined;

    return {
      id,
      content: body.trim(),
      color: String(fm.color),
      position: pos ?? { x: 100, y: 100 },
      size: sz ?? undefined,
      boardId: this.boardId,
      createdAt: fm.created_at
        ? String(fm.created_at)
        : new Date().toISOString(),
      updatedAt: fm.updated_at
        ? String(fm.updated_at)
        : new Date().toISOString(),
      createdBy: fm.created_by != null ? String(fm.created_by) : undefined,
      updatedBy: fm.updated_by != null ? String(fm.updated_by) : undefined,
    };
  }

  protected serialize(note: StickyNote): string {
    return this.serializeStandard(note, STICKY_NOTE_BODY_KEYS, note.content);
  }
}
