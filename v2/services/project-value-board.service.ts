// Project Value Board service — business logic over ProjectValueBoardRepository.

import type { ProjectValueBoardRepository } from "../repositories/project-value-board.repository.ts";
import type {
  CreateProjectValueBoard,
  ListProjectValueBoardOptions,
  ProjectValueBoard,
  UpdateProjectValueBoard,
} from "../types/project-value-board.types.ts";
import { ciIncludes } from "../utils/string.ts";
import { BaseService } from "./base.service.ts";

export class ProjectValueBoardService extends BaseService<
  ProjectValueBoard,
  CreateProjectValueBoard,
  UpdateProjectValueBoard,
  ListProjectValueBoardOptions
> {
  constructor(repo: ProjectValueBoardRepository) {
    super(repo);
  }

  protected applyFilters(
    items: ProjectValueBoard[],
    options: ListProjectValueBoardOptions,
  ): ProjectValueBoard[] {
    if (options.project) {
      items = items.filter((b) => b.project === options.project);
    }
    if (options.q) {
      const q = options.q;
      items = items.filter(
        (b) =>
          ciIncludes(b.title, q) ||
          ciIncludes(b.notes, q) ||
          b.customerSegments.some((s) => ciIncludes(s, q)) ||
          b.problem.some((s) => ciIncludes(s, q)) ||
          b.solution.some((s) => ciIncludes(s, q)) ||
          b.benefit.some((s) => ciIncludes(s, q)),
      );
    }
    return items;
  }
}
