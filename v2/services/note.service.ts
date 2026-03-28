// Note service — orchestrates repository logic.
// Consumed by API routes, MCP tools, and SSR views.

import type { NoteRepository } from "../repositories/note.repository.ts";
import type {
  CreateNote,
  ListNoteOptions,
  Note,
  UpdateNote,
} from "../types/note.types.ts";

export class NoteService {
  constructor(private noteRepo: NoteRepository) {}

  async list(options?: ListNoteOptions): Promise<Note[]> {
    let notes = await this.noteRepo.findAll();

    if (options?.project) {
      const p = options.project.toLowerCase();
      notes = notes.filter((n) => (n.project ?? "").toLowerCase() === p);
    }
    if (options?.search) {
      const s = options.search.toLowerCase();
      notes = notes.filter((n) => n.title.toLowerCase().includes(s));
    }

    return notes;
  }

  async getById(id: string): Promise<Note | null> {
    return this.noteRepo.findById(id);
  }

  async getByName(name: string): Promise<Note | null> {
    const all = await this.noteRepo.findAll();
    const lower = name.toLowerCase();
    return all.find((n) => n.title.toLowerCase() === lower) ?? null;
  }

  async getBatch(ids: string[]): Promise<Note[]> {
    const results = await Promise.all(
      ids.map((id) => this.noteRepo.findById(id)),
    );
    return results.filter((n): n is Note => n !== null);
  }

  async create(data: CreateNote): Promise<Note> {
    return this.noteRepo.create(data);
  }

  async update(id: string, data: UpdateNote): Promise<Note | null> {
    return this.noteRepo.update(id, data);
  }

  async delete(id: string): Promise<boolean> {
    return this.noteRepo.delete(id);
  }
}
