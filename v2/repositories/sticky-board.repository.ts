// Sticky Board repository — markdown file CRUD under sticky-notes/*.md (board manifests).

import { serializeFrontmatter } from "../utils/frontmatter.ts";
import type {
  CreateStickyBoard,
  StickyBoard,
  UpdateStickyBoard,
} from "../types/sticky-note.types.ts";
import { CachedMarkdownRepository } from "./cached.repository.ts";
import {
  rowToStickyBoard,
  STICKY_BOARD_TABLE,
} from "../domains/sticky-note/cache.ts";

export class StickyBoardRepository extends CachedMarkdownRepository<
  StickyBoard,
  CreateStickyBoard,
  UpdateStickyBoard
> {
  protected readonly tableName = STICKY_BOARD_TABLE;

  constructor(projectDir: string) {
    super(projectDir, {
      directory: "sticky-notes",
      idPrefix: "sboard",
      nameField: "title",
    });
  }

  protected rowToEntity(row: Record<string, unknown>): StickyBoard {
    return rowToStickyBoard(row);
  }

  protected fromCreateInput(
    data: CreateStickyBoard,
    id: string,
    now: string,
  ): StickyBoard {
    return {
      ...data,
      id,
      title: data.title,
      description: data.description,
      projects: data.projects ?? [],
      createdAt: now,
      updatedAt: now,
    };
  }

  protected parse(
    filename: string,
    fm: Record<string, unknown>,
    _body: string,
  ): StickyBoard | null {
    // Board files use sboard_ prefix — skip note files and subdirectory markers
    const id = fm.id ? String(fm.id) : filename.replace(/\.md$/, "");
    if (!id.startsWith("sboard")) return null;
    if (!fm.title) return null;

    return {
      id,
      title: String(fm.title),
      description: fm.description != null ? String(fm.description) : undefined,
      projects: Array.isArray(fm.projects)
        ? (fm.projects as unknown[]).map(String)
        : [],
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

  protected serialize(board: StickyBoard): string {
    const fm: Record<string, unknown> = {
      id: board.id,
      title: board.title,
    };
    if (board.description) fm.description = board.description;
    if (board.projects.length > 0) fm.projects = board.projects;
    fm.created_at = board.createdAt;
    fm.updated_at = board.updatedAt;
    if (board.createdBy) fm.created_by = board.createdBy;
    if (board.updatedBy) fm.updated_by = board.updatedBy;

    return serializeFrontmatter(fm, "");
  }
}
