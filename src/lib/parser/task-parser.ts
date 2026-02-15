/**
 * Task parser class for parsing and serializing task-related markdown.
 * Handles task CRUD operations and markdown conversion.
 */
import { Task, TaskConfig } from "../types.ts";
import { BaseParser } from "./core.ts";

export class TaskParser extends BaseParser {
  constructor(filePath: string) {
    super(filePath);
  }

  /**
   * Parses a task from markdown lines starting at the given index.
   * Returns the parsed task and the next line index to process.
   */
  parseTask(
    lines: string[],
    startIndex: number,
    section: string,
  ): { task: Task | null; nextIndex: number } {
    const line = lines[startIndex];
    let i = startIndex + 1;

    // Extract task info from line
    const taskMatch = line.match(
      /^(\s*)- \[([ x])\] (?:\(([^)]+)\))?\s*(.+?)(?:\s*\{([^}]+)\})?$/,
    );
    if (!taskMatch) {
      return { task: null, nextIndex: i };
    }

    const [, indent, completedChar, id, title, configStr] = taskMatch;
    const completed = completedChar === "x";
    const indentLevel = indent.length;

    // Parse config
    const config: TaskConfig = {};
    if (configStr) {
      const configPairs = configStr.split(";");
      for (const pair of configPairs) {
        const [key, value] = pair.split(":").map((s) => s.trim());
        if (key && value) {
          switch (key) {
            case "tag":
              config.tag = value.replace(/[\[\]]/g, "").split(",").map((t) =>
                t.trim()
              );
              break;
            case "due_date":
              config.due_date = value;
              break;
            case "assignee":
              config.assignee = value;
              break;
            case "priority":
              config.priority = parseInt(value);
              break;
            case "effort":
              config.effort = parseInt(value);
              break;
            case "blocked_by":
              config.blocked_by = value.replace(/[\[\]]/g, "").split(",").map(
                (t) => t.trim(),
              ).filter((t) => t);
              break;
            case "milestone":
              config.milestone = value;
              break;
            case "planned_start":
              config.planned_start = value;
              break;
            case "planned_end":
              config.planned_end = value;
              break;
          }
        }
      }
    }

    const task: Task = {
      id: id || this.generateNextTaskId(),
      title,
      completed,
      section,
      config,
      description: [],
      children: [],
    };

    // Parse description and children
    while (i < lines.length) {
      const nextLine = lines[i];
      const nextIndent = nextLine.length - nextLine.trimStart().length;

      // If we hit a line with same or less indentation that's not a continuation, we're done
      if (nextLine.trim() && nextIndent <= indentLevel) {
        break;
      }

      // If it's a subtask
      if (nextLine.match(/^\s*- \[([ x])\]/)) {
        const childResult = this.parseTask(lines, i, section);
        if (childResult.task) {
          childResult.task.parentId = task.id;
          task.children!.push(childResult.task);
        }
        i = childResult.nextIndex;
        continue;
      }

      // If it's description
      if (nextLine.trim() && !nextLine.match(/^\s*- \[([ x])\]/)) {
        task.description!.push(nextLine.trim());
      }

      i++;
    }

    return { task, nextIndex: i };
  }

  /**
   * Converts a task to markdown format.
   */
  taskToMarkdown(task: Task, indentLevel: number): string {
    const indent = "  ".repeat(indentLevel);
    const checkbox = task.completed ? "[x]" : "[ ]";
    const idPart = task.id ? ` (${task.id})` : "";

    let configStr = "";
    if (Object.keys(task.config).length > 0) {
      const configParts: string[] = [];
      if (task.config.tag) {
        configParts.push(`tag: [${task.config.tag.join(", ")}]`);
      }
      if (task.config.due_date) {
        configParts.push(`due_date: ${task.config.due_date}`);
      }
      if (task.config.assignee) {
        configParts.push(`assignee: ${task.config.assignee}`);
      }
      if (task.config.priority) {
        configParts.push(`priority: ${task.config.priority}`);
      }
      if (task.config.effort) configParts.push(`effort: ${task.config.effort}`);
      if (task.config.blocked_by && task.config.blocked_by.length > 0) {
        configParts.push(`blocked_by: [${task.config.blocked_by.join(", ")}]`);
      }
      if (task.config.milestone) {
        configParts.push(`milestone: ${task.config.milestone}`);
      }
      if (task.config.planned_start) {
        configParts.push(`planned_start: ${task.config.planned_start}`);
      }
      if (task.config.planned_end) {
        configParts.push(`planned_end: ${task.config.planned_end}`);
      }
      if (configParts.length > 0) {
        configStr = ` {${configParts.join("; ")}}`;
      }
    }

    let result = `${indent}- ${checkbox}${idPart} ${task.title}${configStr}\n`;

    // Add description
    if (task.description && task.description.length > 0) {
      for (const desc of task.description) {
        result += `${indent}  ${desc}\n`;
      }
    }

    // Add children
    if (task.children && task.children.length > 0) {
      for (const child of task.children) {
        result += this.taskToMarkdown(child, indentLevel + 1);
      }
    }

    return result;
  }

  /**
   * Updates a task in the task list recursively.
   */
  updateTaskInList(
    tasks: Task[],
    taskId: string,
    updates: Partial<Task>,
  ): Task[] | null {
    for (let i = 0; i < tasks.length; i++) {
      if (tasks[i].id === taskId) {
        // Preserve children and other important properties that shouldn't be overwritten
        const preservedChildren = tasks[i].children;
        const preservedParentId = tasks[i].parentId;

        tasks[i] = {
          ...tasks[i],
          ...updates,
          // Always preserve these properties unless explicitly being updated
          children: updates.children !== undefined
            ? updates.children
            : preservedChildren,
          parentId: updates.parentId !== undefined
            ? updates.parentId
            : preservedParentId,
        };
        return tasks;
      }
      if (tasks[i].children && tasks[i].children!.length > 0) {
        const updatedChildren = this.updateTaskInList(
          tasks[i].children!,
          taskId,
          updates,
        );
        if (updatedChildren) {
          tasks[i].children = updatedChildren;
          return tasks;
        }
      }
    }
    return null;
  }

  /**
   * Deletes a task from the task list recursively.
   */
  deleteTaskFromList(tasks: Task[], taskId: string): Task[] {
    return tasks.filter((task) => {
      if (task.id === taskId) return false;
      if (task.children && task.children.length > 0) {
        task.children = this.deleteTaskFromList(task.children, taskId);
      }
      return true;
    });
  }

  /**
   * Checks if a child was deleted by comparing original and filtered task lists.
   */
  hasDeletedChild(original: Task[], filtered: Task[]): boolean {
    for (let i = 0; i < original.length; i++) {
      if (original[i].children && filtered[i]?.children) {
        if (original[i].children!.length !== filtered[i].children!.length) {
          return true;
        }
        if (
          this.hasDeletedChild(original[i].children!, filtered[i].children!)
        ) return true;
      }
    }
    return false;
  }

  /**
   * Adds a child task to a parent in the task list recursively.
   */
  addChildTask(
    tasks: Task[],
    parentId: string,
    childTask: Task,
  ): boolean {
    for (const task of tasks) {
      if (task.id === parentId) {
        if (!task.children) task.children = [];
        task.children.push(childTask);
        return true;
      }
      if (
        task.children && this.addChildTask(task.children, parentId, childTask)
      ) {
        return true;
      }
    }
    return false;
  }

  /**
   * Generates the next task ID based on existing tasks.
   */
  generateNextTaskId(): string {
    try {
      const content = Deno.readTextFileSync(this.filePath);
      const lines = content.split("\n");
      let maxId = 0;

      // Find all task IDs and get the highest number
      for (const line of lines) {
        const taskMatch = line.match(/^(\s*)- \[([ x])\] \(([^)]+)\)/);
        if (taskMatch) {
          const taskId = taskMatch[3];
          const numericId = parseInt(taskId);
          if (!isNaN(numericId) && numericId > maxId) {
            maxId = numericId;
          }
        }
      }

      return (maxId + 1).toString();
    } catch (error) {
      console.error("Error generating next task ID:", error);
      return "1";
    }
  }
}
