/**
 * Unit tests for TasksDirectoryParser.
 */
import {
  assertEquals,
  assertExists,
  assertStringIncludes,
} from "jsr:@std/assert";
import { TasksDirectoryParser } from "../../src/lib/parser/directory/tasks.ts";
import type { Task } from "../../src/lib/types.ts";

const TEST_DIR = "/tmp/mdplanner-test-tasks-" + Date.now();

async function setup(): Promise<TasksDirectoryParser> {
  await Deno.mkdir(TEST_DIR, { recursive: true });
  return new TasksDirectoryParser(TEST_DIR);
}

async function cleanup(): Promise<void> {
  try {
    await Deno.remove(TEST_DIR, { recursive: true });
  } catch {
    // Ignore cleanup errors
  }
}

// === Basic CRUD Operations ===

Deno.test("TasksDirectoryParser - creates and reads task", async () => {
  const parser = await setup();

  try {
    const task = await parser.add({
      title: "Test Task",
      completed: false,
      section: "Todo",
      config: {},
    });

    assertExists(task.id);
    assertEquals(task.title, "Test Task");
    assertEquals(task.completed, false);
    assertEquals(task.section, "Todo");

    const retrieved = await parser.read(task.id);
    assertExists(retrieved);
    assertEquals(retrieved.title, "Test Task");
  } finally {
    await cleanup();
  }
});

Deno.test("TasksDirectoryParser - creates task with full config", async () => {
  const parser = await setup();

  try {
    const task = await parser.add({
      title: "Configured Task",
      completed: false,
      section: "In Progress",
      config: {
        tag: ["bug", "urgent"],
        due_date: "2026-03-15",
        assignee: "alice",
        priority: 1,
        effort: 4,
        milestone: "v1.0",
        blocked_by: ["task_001"],
      },
      description: ["This task needs attention.", "It is high priority."],
    });

    const retrieved = await parser.read(task.id);
    assertExists(retrieved);
    assertEquals(retrieved.config.tag, ["bug", "urgent"]);
    assertEquals(retrieved.config.due_date, "2026-03-15");
    assertEquals(retrieved.config.assignee, "alice");
    assertEquals(retrieved.config.priority, 1);
    assertEquals(retrieved.config.effort, 4);
    assertEquals(retrieved.config.milestone, "v1.0");
    assertEquals(retrieved.config.blocked_by, ["task_001"]);
    assertEquals(retrieved.description, [
      "This task needs attention.",
      "It is high priority.",
    ]);
  } finally {
    await cleanup();
  }
});

Deno.test("TasksDirectoryParser - updates task", async () => {
  const parser = await setup();

  try {
    const task = await parser.add({
      title: "Original Title",
      completed: false,
      section: "Todo",
      config: {},
    });

    const updated = await parser.update(task.id, {
      title: "Updated Title",
      completed: true,
      config: { priority: 2 },
    });

    assertExists(updated);
    assertEquals(updated.title, "Updated Title");
    assertEquals(updated.completed, true);
    assertEquals(updated.config.priority, 2);
  } finally {
    await cleanup();
  }
});

Deno.test("TasksDirectoryParser - deletes task", async () => {
  const parser = await setup();

  try {
    const task = await parser.add({
      title: "To Delete",
      completed: false,
      section: "Todo",
      config: {},
    });

    const deleted = await parser.delete(task.id);
    assertEquals(deleted, true);

    const retrieved = await parser.read(task.id);
    assertEquals(retrieved, null);
  } finally {
    await cleanup();
  }
});

// === Section Management ===

Deno.test("TasksDirectoryParser - creates tasks in different sections", async () => {
  const parser = await setup();

  try {
    await parser.add({
      title: "Backlog Task",
      completed: false,
      section: "Backlog",
      config: {},
    });
    await parser.add({
      title: "Todo Task",
      completed: false,
      section: "Todo",
      config: {},
    });
    await parser.add({
      title: "Done Task",
      completed: true,
      section: "Done",
      config: {},
    });

    const sections = await parser.listSections();
    assertEquals(sections.length, 3);
    assertEquals(sections.sort(), ["Backlog", "Done", "Todo"]);
  } finally {
    await cleanup();
  }
});

Deno.test("TasksDirectoryParser - reads tasks by section", async () => {
  const parser = await setup();

  try {
    await parser.add({
      title: "Todo 1",
      completed: false,
      section: "Todo",
      config: {},
    });
    await parser.add({
      title: "Todo 2",
      completed: false,
      section: "Todo",
      config: {},
    });
    await parser.add({
      title: "Done 1",
      completed: true,
      section: "Done",
      config: {},
    });

    const todoTasks = await parser.readBySection("Todo");
    assertEquals(todoTasks.length, 2);

    const doneTasks = await parser.readBySection("Done");
    assertEquals(doneTasks.length, 1);
  } finally {
    await cleanup();
  }
});

Deno.test("TasksDirectoryParser - moves task between sections", async () => {
  const parser = await setup();

  try {
    const task = await parser.add({
      title: "Moving Task",
      completed: false,
      section: "Todo",
      config: {},
    });

    const moved = await parser.moveToSection(task.id, "In Progress");
    assertEquals(moved, true);

    const retrieved = await parser.read(task.id);
    assertExists(retrieved);
    assertEquals(retrieved.section, "In Progress");

    // Verify old location is empty
    const todoTasks = await parser.readBySection("Todo");
    assertEquals(todoTasks.length, 0);
  } finally {
    await cleanup();
  }
});

Deno.test("TasksDirectoryParser - sanitizes section names for filesystem", async () => {
  const parser = await setup();

  try {
    await parser.add({
      title: "Task",
      completed: false,
      section: "In Progress",
      config: {},
    });

    // Section should be stored as "in_progress" directory
    const stat = await Deno.stat(`${TEST_DIR}/board/in_progress`);
    assertEquals(stat.isDirectory, true);
  } finally {
    await cleanup();
  }
});

// === Subtasks ===

Deno.test("TasksDirectoryParser - creates task with subtasks", async () => {
  const parser = await setup();

  try {
    const task = await parser.add({
      title: "Parent Task",
      completed: false,
      section: "Todo",
      config: {},
      children: [
        {
          id: "sub_1",
          title: "Subtask 1",
          completed: false,
          section: "Todo",
          config: {},
        },
        {
          id: "sub_2",
          title: "Subtask 2",
          completed: true,
          section: "Todo",
          config: {},
        },
      ],
    });

    const retrieved = await parser.read(task.id);
    assertExists(retrieved);
    assertExists(retrieved.children);
    assertEquals(retrieved.children!.length, 2);
    assertEquals(retrieved.children![0].title, "Subtask 1");
    assertEquals(retrieved.children![0].completed, false);
    assertEquals(retrieved.children![1].title, "Subtask 2");
    assertEquals(retrieved.children![1].completed, true);
  } finally {
    await cleanup();
  }
});

// === File Format Tests ===

Deno.test("TasksDirectoryParser - generates valid markdown file", async () => {
  const parser = await setup();

  try {
    const task = await parser.add({
      title: "Format Test",
      completed: false,
      section: "Todo",
      config: {
        tag: ["feature"],
        priority: 2,
      },
      description: ["Task description here"],
    });

    // Read raw file content
    const filePath = `${TEST_DIR}/board/todo/${task.id}.md`;
    const fileContent = await Deno.readTextFile(filePath);

    // Verify frontmatter structure
    assertStringIncludes(fileContent, "---");
    assertStringIncludes(fileContent, `id: ${task.id}`);
    assertStringIncludes(fileContent, "completed: false");
    assertStringIncludes(fileContent, "tag: [feature]");
    assertStringIncludes(fileContent, "priority: 2");
    assertStringIncludes(fileContent, "# Format Test");
    assertStringIncludes(fileContent, "Task description here");
  } finally {
    await cleanup();
  }
});

// === Edge Cases ===

Deno.test("TasksDirectoryParser - handles empty description", async () => {
  const parser = await setup();

  try {
    const task = await parser.add({
      title: "No Description",
      completed: false,
      section: "Todo",
      config: {},
    });

    const retrieved = await parser.read(task.id);
    assertExists(retrieved);
    assertEquals(retrieved.description, undefined);
  } finally {
    await cleanup();
  }
});

Deno.test("TasksDirectoryParser - update returns null for non-existent task", async () => {
  const parser = await setup();

  try {
    const result = await parser.update("nonexistent_id", {
      title: "New Title",
    });
    assertEquals(result, null);
  } finally {
    await cleanup();
  }
});

Deno.test("TasksDirectoryParser - delete returns false for non-existent task", async () => {
  const parser = await setup();

  try {
    const result = await parser.delete("nonexistent_id");
    assertEquals(result, false);
  } finally {
    await cleanup();
  }
});

Deno.test("TasksDirectoryParser - handles special characters in title", async () => {
  const parser = await setup();

  try {
    const task = await parser.add({
      title: "Task with: colons & special <chars>",
      completed: false,
      section: "Todo",
      config: {},
    });

    const retrieved = await parser.read(task.id);
    assertExists(retrieved);
    assertEquals(retrieved.title, "Task with: colons & special <chars>");
  } finally {
    await cleanup();
  }
});

// === Bulk Operations ===

Deno.test("TasksDirectoryParser - readAll returns tasks from all sections", async () => {
  const parser = await setup();

  try {
    await parser.add({
      title: "T1",
      completed: false,
      section: "Backlog",
      config: {},
    });
    await parser.add({
      title: "T2",
      completed: false,
      section: "Todo",
      config: {},
    });
    await parser.add({
      title: "T3",
      completed: false,
      section: "In Progress",
      config: {},
    });
    await parser.add({
      title: "T4",
      completed: true,
      section: "Done",
      config: {},
    });

    const allTasks = await parser.readAll();
    assertEquals(allTasks.length, 4);
  } finally {
    await cleanup();
  }
});

Deno.test("TasksDirectoryParser - saveAll replaces all tasks", async () => {
  const parser = await setup();

  try {
    // Create initial tasks
    const task1 = await parser.add({
      title: "T1",
      completed: false,
      section: "Todo",
      config: {},
    });
    await parser.add({
      title: "T2",
      completed: false,
      section: "Todo",
      config: {},
    });

    // Save new set (replacing all)
    const newTasks: Task[] = [
      { ...task1, title: "Updated T1" },
      {
        id: "new_task",
        title: "Brand New",
        completed: false,
        section: "Done",
        config: {},
      },
    ];

    await parser.saveAll(newTasks);

    const allTasks = await parser.readAll();
    assertEquals(allTasks.length, 2);

    const titles = allTasks.map((t) => t.title).sort();
    assertEquals(titles, ["Brand New", "Updated T1"]);
  } finally {
    await cleanup();
  }
});

// === ID Generation ===

Deno.test("TasksDirectoryParser - generateId creates unique IDs", () => {
  const parser = new TasksDirectoryParser("/tmp/test");

  const id1 = parser.generateId();
  const id2 = parser.generateId();

  assertEquals(id1.startsWith("task_"), true);
  assertEquals(id2.startsWith("task_"), true);
  assertEquals(id1 !== id2, true);
});

// === Time Entries ===
// Note: Complex nested arrays (time_entries with objects) require full YAML library support.
// The simple frontmatter parser has limited support for multiline object arrays.
// Time entries are typically managed separately through the time tracking API.

Deno.test("TasksDirectoryParser - stores time entries in frontmatter", async () => {
  const parser = await setup();

  try {
    const task = await parser.add({
      title: "Task with time",
      completed: false,
      section: "Todo",
      config: {
        time_entries: [
          {
            id: "te_1",
            date: "2026-02-15",
            hours: 2,
            person: "alice",
            description: "Initial work",
          },
        ],
      },
    });

    // Verify the file contains time_entries data
    const filePath = `${TEST_DIR}/board/todo/${task.id}.md`;
    const fileContent = await Deno.readTextFile(filePath);
    assertStringIncludes(fileContent, "time_entries:");
  } finally {
    await cleanup();
  }
});

// === Planning Fields ===

Deno.test("TasksDirectoryParser - preserves planning dates", async () => {
  const parser = await setup();

  try {
    const task = await parser.add({
      title: "Planned Task",
      completed: false,
      section: "Todo",
      config: {
        planned_start: "2026-03-01",
        planned_end: "2026-03-15",
      },
    });

    const retrieved = await parser.read(task.id);
    assertExists(retrieved);
    assertEquals(retrieved.config.planned_start, "2026-03-01");
    assertEquals(retrieved.config.planned_end, "2026-03-15");
  } finally {
    await cleanup();
  }
});
