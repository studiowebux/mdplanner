// Shared context for the task MCP tool modules: the TaskService instance plus
// the archived-guard helper every mutation tool uses. Built once by
// registerTaskTools (tasks.ts) and threaded into each tool group so the helper
// + service are defined in exactly one place.

import { getTaskService } from "../../../singletons/services.ts";
import { err } from "../../utils.ts";

export type TaskService = ReturnType<typeof getTaskService>;
export type LiveTask = NonNullable<Awaited<ReturnType<TaskService["getById"]>>>;

export type RequireLiveTaskResult =
  | { err: ReturnType<typeof err>; task?: undefined }
  | { err?: undefined; task: LiveTask };

export interface TaskToolContext {
  service: TaskService;
  // Resolve a task and guard against archived state. Mutation tools call this
  // before touching the task; archived rows return an err result so callers
  // can route to Restore/HardDelete instead. Matches the canonical pattern
  // (Strategic Levels reference).
  requireLiveTask: (id: string) => Promise<RequireLiveTaskResult>;
}

export function createTaskToolContext(): TaskToolContext {
  const service = getTaskService();
  const requireLiveTask = async (
    id: string,
  ): Promise<RequireLiveTaskResult> => {
    const task = await service.getById(id);
    if (!task) return { err: err(`Task '${id}' not found`) };
    if (task.archived === true) {
      return { err: err(`Task '${id}' is archived`) };
    }
    return { task };
  };
  return { service, requireLiveTask };
}
