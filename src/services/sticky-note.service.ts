// Sticky Note service — business logic over StickyNoteRepository.

import type { StickyNoteRepository } from "../repositories/sticky-note.repository.ts";
import type {
  CreateStickyNote,
  ListStickyNoteOptions,
  StickyNote,
  UpdatePosition,
  UpdateSize,
  UpdateStickyNote,
} from "../types/sticky-note.types.ts";
import { ciIncludes } from "../utils/string.ts";
import { BaseService } from "./base.service.ts";

export class StickyNoteService extends BaseService<
  StickyNote,
  CreateStickyNote,
  UpdateStickyNote,
  ListStickyNoteOptions
> {
  constructor(private stickyNoteRepo: StickyNoteRepository) {
    super(stickyNoteRepo);
  }

  protected applyFilters(
    notes: StickyNote[],
    options: ListStickyNoteOptions,
  ): StickyNote[] {
    if (options.color) {
      notes = notes.filter((n) => n.color === options.color);
    }
    if (options.project) {
      notes = notes.filter((n) => ciIncludes(n.content, options.project!));
    }
    if (options.q) {
      notes = notes.filter((n) => ciIncludes(n.content, options.q!));
    }
    return notes;
  }

  async updatePosition(
    id: string,
    position: UpdatePosition,
  ): Promise<StickyNote | null> {
    return this.stickyNoteRepo.updatePosition(id, position);
  }

  async updateSize(
    id: string,
    size: UpdateSize,
  ): Promise<StickyNote | null> {
    return this.stickyNoteRepo.updateSize(id, size);
  }
}
