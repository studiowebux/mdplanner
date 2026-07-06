// Pure task list-filtering, shared by every TaskService list* method (board,
// archived, board-archived, analytics). No I/O — filters an in-memory array by
// section/project/milestone/assignee/tags and the `ready` (unblocked) predicate.

import type { ListTaskOptions, Task } from "../types/task.types.ts";
import { ciEquals } from "../utils/string.ts";

export function applyTaskFilters(
  tasks: Task[],
  options?: ListTaskOptions,
): Task[] {
  let result = tasks;
  if (options?.section) {
    result = result.filter((t) => ciEquals(t.section, options.section));
  }
  if (options?.project) {
    result = result.filter((t) => ciEquals(t.project, options.project));
  }
  if (options?.milestone) {
    result = result.filter((t) => ciEquals(t.milestone, options.milestone));
  }
  if (options?.assignee) {
    result = result.filter((t) => t.assignee === options.assignee);
  }
  if (options?.tags?.length) {
    const required = options.tags.map((t) => t.toLowerCase());
    result = result.filter((t) => {
      const taskTags = (t.tags ?? []).map((tg) => tg.toLowerCase());
      return required.every((r) => taskTags.includes(r));
    });
  }
  if (options?.ready) {
    result = result.filter((t) => {
      if (!t.blocked_by?.length) return true;
      return t.blocked_by.every((bid) => {
        const blocker = result.find((bt) => bt.id === bid);
        return !blocker || blocker.completed;
      });
    });
  }
  return result;
}
