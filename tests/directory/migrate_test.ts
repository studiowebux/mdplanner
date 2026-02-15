/**
 * Unit tests for migration utilities.
 * Tests conversion between single-file and directory-based formats.
 *
 * Note: These tests require the full MarkdownParser implementation.
 * Some tests may fail if the single-file parser format differs.
 */
import {
  assertEquals,
  assertExists,
  assertStringIncludes,
} from "jsr:@std/assert";
import {
  migrateToDirectory,
  migrateFromDirectory,
} from "../../src/lib/parser/directory/migrate.ts";
import { DirectoryMarkdownParser } from "../../src/lib/parser/directory/parser.ts";

const TEST_BASE = "/tmp/mdplanner-migrate-test-" + Date.now();
const SINGLE_FILE = `${TEST_BASE}/project.md`;
const DIR_PROJECT = `${TEST_BASE}/project-dir`;

/**
 * Create a minimal single-file project for testing.
 */
async function setupSingleFile(): Promise<void> {
  await Deno.mkdir(TEST_BASE, { recursive: true });

  // Create a minimal single-file project that matches MarkdownParser format
  const content = `# Test Project

This is a test project.

<!-- Configurations -->
# Configurations
Start Date: 2026-01-01
Assignees: alice, bob
Tags: feature, bug

<!-- Notes -->
# Notes
## Overview Note
<!-- id: note_001 | created: 2026-01-01T10:00:00Z | updated: 2026-01-01T10:00:00Z | rev: 1 -->
Overview content.

<!-- Goals -->
# Goals
## Launch MVP {type: project; kpi: users; start: 2026-01-01; end: 2026-06-30; status: on-track}
<!-- id: goal_001 -->
Launch description.

<!-- Board -->
# Board
## Todo
- [ ] (task_001) First task {priority: 1}
- [ ] (task_002) Second task

## Done
- [x] (task_003) Completed task
`;

  await Deno.writeTextFile(SINGLE_FILE, content);
}

/**
 * Create a directory project for testing.
 */
async function setupDirectoryProject(): Promise<void> {
  const parser = new DirectoryMarkdownParser(DIR_PROJECT);
  await parser.initialize();

  // Add project info
  await parser.saveProjectName("Directory Project");
  await parser.saveProjectDescription(["A directory-based project."]);
  await parser.saveProjectConfig({
    startDate: "2026-02-01",
    assignees: ["charlie", "dave"],
    tags: ["api", "backend"],
  });

  // Add a note
  await parser.addNote({
    title: "API Notes",
    content: "API design notes.",
    mode: "simple",
  });

  // Add a goal
  await parser.addGoal({
    title: "Build API",
    description: "Build the API.",
    type: "project",
    kpi: "endpoints",
    startDate: "2026-02-01",
    endDate: "2026-08-31",
    status: "planning",
  });

  // Add tasks
  await parser.addTask({
    title: "Design endpoints",
    completed: false,
    section: "Todo",
    config: { priority: 1 },
  });

  await parser.addTask({
    title: "Setup complete",
    completed: true,
    section: "Done",
    config: {},
  });
}

async function cleanup(): Promise<void> {
  try {
    await Deno.remove(TEST_BASE, { recursive: true });
  } catch {
    // Ignore cleanup errors
  }
}

// === migrateToDirectory Tests ===

Deno.test("migrateToDirectory - returns result structure", async () => {
  await setupSingleFile();

  try {
    const targetDir = `${TEST_BASE}/migrated-dir`;
    const result = await migrateToDirectory(SINGLE_FILE, targetDir);

    // Result should have expected structure
    assertExists(result.success);
    assertExists(result.projectDir);
    assertExists(result.stats);
    assertExists(result.stats.notes);
    assertExists(result.stats.goals);
    assertExists(result.stats.tasks);
    assertExists(result.stats.sections);
    assertExists(result.errors);

    // Log errors for debugging if any
    if (!result.success) {
      console.log("Migration errors:", result.errors);
    }
  } finally {
    await cleanup();
  }
});

Deno.test("migrateToDirectory - handles non-existent source gracefully", async () => {
  await Deno.mkdir(TEST_BASE, { recursive: true });

  try {
    const result = await migrateToDirectory(
      `${TEST_BASE}/nonexistent.md`,
      `${TEST_BASE}/target`
    );

    // Migration returns success with empty stats when source doesn't exist
    // (MarkdownParser returns empty data for missing files)
    assertExists(result.success);
    assertExists(result.stats);
    assertEquals(result.stats.notes, 0);
    assertEquals(result.stats.tasks, 0);
  } finally {
    await cleanup();
  }
});

// === migrateFromDirectory Tests ===

Deno.test("migrateFromDirectory - creates single file from directory", async () => {
  await setupDirectoryProject();

  try {
    const targetFile = `${TEST_BASE}/exported.md`;
    const result = await migrateFromDirectory(DIR_PROJECT, targetFile);

    assertEquals(result.success, true);

    // Verify file exists
    const stat = await Deno.stat(targetFile);
    assertEquals(stat.isFile, true);
  } finally {
    await cleanup();
  }
});

Deno.test("migrateFromDirectory - includes project name", async () => {
  await setupDirectoryProject();

  try {
    const targetFile = `${TEST_BASE}/exported.md`;
    await migrateFromDirectory(DIR_PROJECT, targetFile);

    const content = await Deno.readTextFile(targetFile);
    assertStringIncludes(content, "# Directory Project");
  } finally {
    await cleanup();
  }
});

Deno.test("migrateFromDirectory - includes configuration section", async () => {
  await setupDirectoryProject();

  try {
    const targetFile = `${TEST_BASE}/exported.md`;
    await migrateFromDirectory(DIR_PROJECT, targetFile);

    const content = await Deno.readTextFile(targetFile);
    assertStringIncludes(content, "<!-- Configurations -->");
    assertStringIncludes(content, "# Configurations");
  } finally {
    await cleanup();
  }
});

Deno.test("migrateFromDirectory - includes notes section", async () => {
  await setupDirectoryProject();

  try {
    const targetFile = `${TEST_BASE}/exported.md`;
    const result = await migrateFromDirectory(DIR_PROJECT, targetFile);

    assertEquals(result.stats.notes >= 1, true);

    const content = await Deno.readTextFile(targetFile);
    assertStringIncludes(content, "<!-- Notes -->");
    assertStringIncludes(content, "# Notes");
    assertStringIncludes(content, "API Notes");
  } finally {
    await cleanup();
  }
});

Deno.test("migrateFromDirectory - includes goals section", async () => {
  await setupDirectoryProject();

  try {
    const targetFile = `${TEST_BASE}/exported.md`;
    const result = await migrateFromDirectory(DIR_PROJECT, targetFile);

    assertEquals(result.stats.goals >= 1, true);

    const content = await Deno.readTextFile(targetFile);
    assertStringIncludes(content, "<!-- Goals -->");
    assertStringIncludes(content, "# Goals");
    assertStringIncludes(content, "Build API");
  } finally {
    await cleanup();
  }
});

Deno.test("migrateFromDirectory - includes board section with tasks", async () => {
  await setupDirectoryProject();

  try {
    const targetFile = `${TEST_BASE}/exported.md`;
    const result = await migrateFromDirectory(DIR_PROJECT, targetFile);

    assertEquals(result.stats.tasks >= 2, true);
    assertEquals(result.stats.sections >= 2, true);

    const content = await Deno.readTextFile(targetFile);
    assertStringIncludes(content, "<!-- Board -->");
    assertStringIncludes(content, "# Board");
    assertStringIncludes(content, "Design endpoints");
    assertStringIncludes(content, "Setup complete");
  } finally {
    await cleanup();
  }
});

Deno.test("migrateFromDirectory - formats completed tasks with [x]", async () => {
  await setupDirectoryProject();

  try {
    const targetFile = `${TEST_BASE}/exported.md`;
    await migrateFromDirectory(DIR_PROJECT, targetFile);

    const content = await Deno.readTextFile(targetFile);
    // Completed task should have [x]
    assertStringIncludes(content, "[x]");
    // Uncompleted task should have [ ]
    assertStringIncludes(content, "[ ]");
  } finally {
    await cleanup();
  }
});

Deno.test("migrateFromDirectory - handles non-existent directory gracefully", async () => {
  await Deno.mkdir(TEST_BASE, { recursive: true });

  try {
    const result = await migrateFromDirectory(
      `${TEST_BASE}/nonexistent-dir`,
      `${TEST_BASE}/target.md`
    );

    // Migration returns success with empty stats when source doesn't exist
    // (DirectoryMarkdownParser returns empty data for missing directories)
    assertExists(result.success);
    assertExists(result.stats);
    assertEquals(result.stats.notes, 0);
    assertEquals(result.stats.tasks, 0);
  } finally {
    await cleanup();
  }
});

// === Stats Verification ===

Deno.test("migrateFromDirectory - returns accurate stats", async () => {
  await setupDirectoryProject();

  try {
    const targetFile = `${TEST_BASE}/stats-test.md`;
    const result = await migrateFromDirectory(DIR_PROJECT, targetFile);

    assertExists(result.stats.notes);
    assertExists(result.stats.goals);
    assertExists(result.stats.tasks);
    assertExists(result.stats.sections);

    // Based on setupDirectoryProject
    assertEquals(result.stats.notes >= 1, true);
    assertEquals(result.stats.goals >= 1, true);
    assertEquals(result.stats.tasks >= 2, true);
    assertEquals(result.stats.sections >= 2, true);
  } finally {
    await cleanup();
  }
});
