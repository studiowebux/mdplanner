// Note service — orchestrates repository logic.
// Consumed by API routes, MCP tools, and SSR views.

import type { NoteRepository } from "../repositories/note.repository.ts";
import type {
  CreateNote,
  ListNoteOptions,
  Note,
  UpdateNote,
} from "../types/note.types.ts";
import type { CacheSync } from "../database/sqlite/mod.ts";
import { insertNoteRow, NOTE_TABLE } from "../domains/note/cache.ts";
import { ciEquals, ciIncludes } from "../utils/string.ts";
import { BaseService } from "./base.service.ts";

/**
 * Note CRUD service: getBatch resolves many ids in one pass; filters by project
 * and title search. Keeps the SQLite cache row current on every mutation so the
 * FTS index (and global search) updates in real time — NoteRepository is
 * disk-only, so the row is written here, mirroring TaskService.cacheUpsert.
 */
export class NoteService extends BaseService<
  Note,
  CreateNote,
  UpdateNote,
  ListNoteOptions
> {
  private cache: CacheSync | null = null;

  constructor(private noteRepo: NoteRepository) {
    super(noteRepo);
  }

  setCache(cache: CacheSync): void {
    this.cache = cache;
  }

  /** Write the note's cache row (delete-then-insert, same as fullSync). No-op when cache is disabled. */
  private cacheUpsert(note: Note): void {
    if (!this.cache) return;
    this.cache.remove(NOTE_TABLE, note.id);
    insertNoteRow(this.cache.getDb(), note);
  }

  private cacheRemove(id: string): void {
    this.cache?.remove(NOTE_TABLE, id);
  }

  /**
   * Re-read the note from disk and re-upsert its cache row. Used after
   * archive/restore/soft-delete (which mutate frontmatter only) so the row
   * reflects the new `archived` flag — `findById` returns archived notes, so
   * the archived row is kept (with `archived=1`) for the search filter; if the
   * note is gone, the row is removed.
   */
  private async cacheReupsert(id: string): Promise<void> {
    if (!this.cache) return;
    const note = await this.noteRepo.findById(id);
    if (note) this.cacheUpsert(note);
    else this.cacheRemove(id);
  }

  protected applyFilters(notes: Note[], options: ListNoteOptions): Note[] {
    if (options.project) {
      notes = notes.filter((n) => ciEquals(n.project, options.project));
    }
    if (options.search) {
      notes = notes.filter((n) => ciIncludes(n.title, options.search!));
    }
    return notes;
  }

  async getBatch(ids: string[]): Promise<Note[]> {
    const results = await Promise.all(
      ids.map((id) => this.noteRepo.findById(id)),
    );
    return results.filter((n): n is Note => n !== null);
  }

  override async create(data: CreateNote): Promise<Note> {
    const created = await super.create(data);
    this.cacheUpsert(created);
    return created;
  }

  override async update(id: string, data: UpdateNote): Promise<Note | null> {
    const updated = await super.update(id, data);
    if (updated) this.cacheUpsert(updated);
    return updated;
  }

  override async delete(id: string): Promise<boolean> {
    const deleted = await super.delete(id);
    if (deleted) await this.cacheReupsert(id);
    return deleted;
  }

  override async archive(id: string, by?: string): Promise<boolean> {
    const archived = await super.archive(id, by);
    if (archived) await this.cacheReupsert(id);
    return archived;
  }

  override async restore(id: string): Promise<boolean> {
    const restored = await super.restore(id);
    if (restored) await this.cacheReupsert(id);
    return restored;
  }

  override async hardDelete(id: string): Promise<boolean> {
    const removed = await super.hardDelete(id);
    if (removed) this.cacheRemove(id);
    return removed;
  }

  async addAttachments(id: string, paths: string[]): Promise<Note | null> {
    const note = await this.noteRepo.findById(id);
    if (!note) return null;
    const attachments = [...(note.attachments ?? []), ...paths];
    const updated = await this.noteRepo.update(id, { attachments });
    if (updated) {
      this.publishChange("updated");
      this.cacheUpsert(updated);
    }
    return updated;
  }
}
