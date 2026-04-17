// Sticky Board service — business logic over StickyBoardRepository.

import type { StickyBoardRepository } from "../repositories/sticky-board.repository.ts";
import type {
  CreateStickyBoard,
  ListStickyBoardOptions,
  StickyBoard,
  UpdateStickyBoard,
} from "../types/sticky-note.types.ts";
import { ciIncludes } from "../utils/string.ts";
import { BaseService } from "./base.service.ts";

export class StickyBoardService extends BaseService<
  StickyBoard,
  CreateStickyBoard,
  UpdateStickyBoard,
  ListStickyBoardOptions
> {
  constructor(repo: StickyBoardRepository) {
    super(repo);
  }

  protected applyFilters(
    boards: StickyBoard[],
    options: ListStickyBoardOptions,
  ): StickyBoard[] {
    if (options.q) {
      boards = boards.filter((b) => ciIncludes(b.title, options.q!));
    }
    return boards;
  }

  /** Create the default board if no boards exist. */
  async ensureDefaultBoard(): Promise<void> {
    const all = await this.repo.findAll();
    if (all.length === 0) {
      await this.create({ title: "Default", projects: [] });
    }
  }
}
