// Note service — orchestrates repository logic.
// Consumed by API routes, MCP tools, and SSR views.

import type { NoteRepository } from "../repositories/note.repository.ts";
import type {
  CreateNote,
  ListNoteOptions,
  Note,
  UpdateNote,
} from "../types/note.types.ts";
import { ciEquals, ciIncludes } from "../utils/string.ts";
import { BaseService } from "./base.service.ts";

/** Note CRUD service: getBatch resolves many ids in one pass; filters by project and title search. */
export class NoteService extends BaseService<
  Note,
  CreateNote,
  UpdateNote,
  ListNoteOptions
> {
  constructor(private noteRepo: NoteRepository) {
    super(noteRepo);
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

  async addAttachments(id: string, paths: string[]): Promise<Note | null> {
    const note = await this.noteRepo.findById(id);
    if (!note) return null;
    const attachments = [...(note.attachments ?? []), ...paths];
    const updated = await this.noteRepo.update(id, { attachments });
    if (updated) this.publishChange("updated");
    return updated;
  }
}
