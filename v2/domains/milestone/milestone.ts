// Milestone domain — pure business logic.
// No framework deps, no disk I/O. Consumed by service layer.

import { markdownToHtml } from "../../utils/markdown.ts";
import type { Task } from "../../types/task.types.ts";
import type { Milestone, MilestoneBase } from "../../types/milestone.types.ts";

function tasksByMilestone(tasks: Task[], name: string): Task[] {
  const result: Task[] = [];
  const collect = (list: Task[]) => {
    for (const t of list) {
      if (t.milestone === name) result.push(t);
      if (t.children) collect(t.children);
    }
  };
  collect(tasks);
  return result;
}

export function enrichMilestone(raw: MilestoneBase, tasks: Task[]): Milestone {
  const linked = tasksByMilestone(tasks, raw.name);
  const completedCount = linked.filter((t) => t.completed).length;
  return {
    ...raw,
    descriptionHtml: markdownToHtml(raw.description),
    taskCount: linked.length,
    completedCount,
    progress: linked.length > 0
      ? Math.round((completedCount / linked.length) * 100)
      : 0,
  };
}

export function enrichMilestones(
  raw: MilestoneBase[],
  tasks: Task[],
): Milestone[] {
  const result = raw.map((m) => enrichMilestone(m, tasks));

  // Surface virtual milestones referenced in tasks but with no backing file.
  const existingNames = new Set(raw.map((m) => m.name));
  const collect = (taskList: Task[]) => {
    for (const task of taskList) {
      if (task.milestone && !existingNames.has(task.milestone)) {
        const name = task.milestone;
        existingNames.add(name);
        const linked = tasksByMilestone(tasks, name);
        const completedCount = linked.filter((t) => t.completed).length;
        result.push({
          id: name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(
            /^-|-$/g,
            "",
          ),
          name,
          status: "open",
          taskCount: linked.length,
          completedCount,
          progress: linked.length > 0
            ? Math.round((completedCount / linked.length) * 100)
            : 0,
        });
      }
      if (task.children) collect(task.children);
    }
  };
  collect(tasks);

  return result;
}
