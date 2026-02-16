/**
 * Unit tests for NotesDirectoryParser.
 */
import { assertEquals, assertExists, assertStringIncludes } from "@std/assert";
import { NotesDirectoryParser } from "../../src/lib/parser/directory/notes.ts";
import type {
  CustomSection,
  Note,
  NoteParagraph,
} from "../../src/lib/types.ts";

const TEST_DIR = "/tmp/mdplanner-test-notes-" + Date.now();

async function setup(): Promise<NotesDirectoryParser> {
  await Deno.mkdir(TEST_DIR, { recursive: true });
  return new NotesDirectoryParser(TEST_DIR);
}

async function cleanup(): Promise<void> {
  try {
    await Deno.remove(TEST_DIR, { recursive: true });
  } catch {
    // Ignore cleanup errors
  }
}

// === Basic CRUD Operations ===

Deno.test("NotesDirectoryParser - creates and reads simple note", async () => {
  const parser = await setup();

  try {
    const note = await parser.add({
      title: "Test Note",
      content: "This is test content.",
      mode: "simple",
    });

    assertExists(note.id);
    assertEquals(note.title, "Test Note");
    assertEquals(note.content, "This is test content.");
    assertEquals(note.mode, "simple");
    assertEquals(note.revision, 1);

    const retrieved = await parser.read(note.id);
    assertExists(retrieved);
    assertEquals(retrieved.title, "Test Note");
    assertEquals(retrieved.content, "This is test content.");
  } finally {
    await cleanup();
  }
});

Deno.test("NotesDirectoryParser - updates note and increments revision", async () => {
  const parser = await setup();

  try {
    const note = await parser.add({
      title: "Original Title",
      content: "Original content",
      mode: "simple",
    });

    const updated = await parser.update(note.id, {
      title: "Updated Title",
      content: "Updated content",
    });

    assertExists(updated);
    assertEquals(updated.title, "Updated Title");
    assertEquals(updated.content, "Updated content");
    assertEquals(updated.revision, 2);
    assertEquals(updated.id, note.id);
  } finally {
    await cleanup();
  }
});

Deno.test("NotesDirectoryParser - deletes note", async () => {
  const parser = await setup();

  try {
    const note = await parser.add({
      title: "To Delete",
      content: "Will be deleted",
      mode: "simple",
    });

    const deleted = await parser.delete(note.id);
    assertEquals(deleted, true);

    const retrieved = await parser.read(note.id);
    assertEquals(retrieved, null);
  } finally {
    await cleanup();
  }
});

Deno.test("NotesDirectoryParser - reads all notes", async () => {
  const parser = await setup();

  try {
    await parser.add({ title: "Note 1", content: "Content 1", mode: "simple" });
    await parser.add({ title: "Note 2", content: "Content 2", mode: "simple" });
    await parser.add({ title: "Note 3", content: "Content 3", mode: "simple" });

    const notes = await parser.readAll();
    assertEquals(notes.length, 3);
  } finally {
    await cleanup();
  }
});

// === Enhanced Mode Tests ===

Deno.test("NotesDirectoryParser - creates enhanced note with paragraphs", async () => {
  const parser = await setup();

  try {
    // Enhanced mode is detected by mode field or custom section markers
    // When mode is explicitly set to "enhanced", it should be preserved
    const note = await parser.add({
      title: "Enhanced Note",
      content: "First paragraph\n\n```typescript\nconst x = 1;\n```",
      paragraphs: [],
      customSections: [],
      mode: "enhanced",
    });

    const retrieved = await parser.read(note.id);
    assertExists(retrieved);
    assertEquals(retrieved.mode, "enhanced");
    // Content is stored in raw form when no custom sections
    assertExists(retrieved.content);
  } finally {
    await cleanup();
  }
});

Deno.test("NotesDirectoryParser - creates enhanced note with custom sections", async () => {
  const parser = await setup();

  try {
    const customSections: CustomSection[] = [
      {
        id: "section1",
        type: "tabs",
        title: "My Tabs",
        order: 0,
        config: {
          tabs: [
            {
              id: "tab1",
              title: "Overview",
              content: [{
                id: "t1",
                type: "text",
                content: "Tab content",
                order: 0,
              }],
            },
          ],
        },
      },
    ];

    const note = await parser.add({
      title: "Tabbed Note",
      content: "",
      paragraphs: [],
      customSections,
      mode: "enhanced",
    });

    const retrieved = await parser.read(note.id);
    assertExists(retrieved);
    assertEquals(retrieved.mode, "enhanced");
    assertExists(retrieved.customSections);
    assertEquals(retrieved.customSections!.length, 1);
  } finally {
    await cleanup();
  }
});

Deno.test("NotesDirectoryParser - preserves split-view sections", async () => {
  const parser = await setup();

  try {
    const customSections: CustomSection[] = [
      {
        id: "split1",
        type: "split-view",
        title: "Comparison",
        order: 0,
        config: {
          splitView: {
            columns: [
              [{
                id: "col1-1",
                type: "text",
                content: "Left column text",
                order: 0,
              }],
              [{
                id: "col2-1",
                type: "text",
                content: "Right column text",
                order: 0,
              }],
            ],
          },
        },
      },
    ];

    const note = await parser.add({
      title: "Split View Note",
      content: "",
      paragraphs: [],
      customSections,
      mode: "enhanced",
    });

    const retrieved = await parser.read(note.id);
    assertExists(retrieved);
    assertExists(retrieved.customSections);
    assertEquals(retrieved.customSections![0].type, "split-view");
  } finally {
    await cleanup();
  }
});

Deno.test("NotesDirectoryParser - preserves timeline sections", async () => {
  const parser = await setup();

  try {
    const customSections: CustomSection[] = [
      {
        id: "timeline1",
        type: "timeline",
        title: "Project Timeline",
        order: 0,
        config: {
          timeline: [
            {
              id: "event1",
              title: "Phase 1 Complete",
              status: "success",
              date: "2026-01-15",
              content: [{
                id: "e1",
                type: "text",
                content: "Details",
                order: 0,
              }],
            },
            {
              id: "event2",
              title: "Phase 2 In Progress",
              status: "pending",
              content: [{
                id: "e2",
                type: "text",
                content: "Working on it",
                order: 0,
              }],
            },
          ],
        },
      },
    ];

    const note = await parser.add({
      title: "Timeline Note",
      content: "",
      paragraphs: [],
      customSections,
      mode: "enhanced",
    });

    const retrieved = await parser.read(note.id);
    assertExists(retrieved);
    assertExists(retrieved.customSections);
    assertEquals(retrieved.customSections![0].type, "timeline");
  } finally {
    await cleanup();
  }
});

// === File Format Tests ===

Deno.test("NotesDirectoryParser - generates valid markdown file", async () => {
  const parser = await setup();

  try {
    const note = await parser.add({
      title: "Format Test",
      content: "Test content here",
      mode: "simple",
    });

    // Read raw file content
    const files = await parser["listFiles"]();
    const fileContent = await Deno.readTextFile(files[0]);

    // Verify frontmatter structure
    assertStringIncludes(fileContent, "---");
    assertStringIncludes(fileContent, "id: " + note.id);
    assertStringIncludes(fileContent, "mode: simple");
    assertStringIncludes(fileContent, "# Format Test");
    assertStringIncludes(fileContent, "Test content here");
  } finally {
    await cleanup();
  }
});

// === Edge Cases ===

Deno.test("NotesDirectoryParser - handles empty content", async () => {
  const parser = await setup();

  try {
    const note = await parser.add({
      title: "Empty Note",
      content: "",
      mode: "simple",
    });

    const retrieved = await parser.read(note.id);
    assertExists(retrieved);
    assertEquals(retrieved.title, "Empty Note");
  } finally {
    await cleanup();
  }
});

Deno.test("NotesDirectoryParser - handles special characters in title", async () => {
  const parser = await setup();

  try {
    const note = await parser.add({
      title: "Note with: colons & special chars",
      content: "Content",
      mode: "simple",
    });

    const retrieved = await parser.read(note.id);
    assertExists(retrieved);
    assertEquals(retrieved.title, "Note with: colons & special chars");
  } finally {
    await cleanup();
  }
});

Deno.test("NotesDirectoryParser - update returns null for non-existent note", async () => {
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

Deno.test("NotesDirectoryParser - delete returns false for non-existent note", async () => {
  const parser = await setup();

  try {
    const result = await parser.delete("nonexistent_id");
    assertEquals(result, false);
  } finally {
    await cleanup();
  }
});

Deno.test("NotesDirectoryParser - preserves timestamps correctly", async () => {
  const parser = await setup();

  try {
    const note = await parser.add({
      title: "Timestamp Test",
      content: "Content",
      mode: "simple",
    });

    const created = note.createdAt;

    // Small delay to ensure different timestamp
    await new Promise((r) => setTimeout(r, 10));

    const updated = await parser.update(note.id, { title: "Updated" });

    assertExists(updated);
    assertEquals(updated.createdAt, created);
    assertEquals(updated.updatedAt !== created, true);
  } finally {
    await cleanup();
  }
});

// === Bulk Operations ===

Deno.test("NotesDirectoryParser - saveAll replaces all notes", async () => {
  const parser = await setup();

  try {
    // Create initial notes
    const note1 = await parser.add({
      title: "Note 1",
      content: "Content 1",
      mode: "simple",
    });
    await parser.add({ title: "Note 2", content: "Content 2", mode: "simple" });

    // Save new set (replacing all)
    const newNotes: Note[] = [
      {
        ...note1,
        title: "Updated Note 1",
        content: "Updated Content 1",
      },
      {
        id: "new_note",
        title: "Brand New",
        content: "New content",
        mode: "simple",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        revision: 1,
      },
    ];

    await parser.saveAll(newNotes);

    const allNotes = await parser.readAll();
    assertEquals(allNotes.length, 2);

    const titles = allNotes.map((n) => n.title).sort();
    assertEquals(titles, ["Brand New", "Updated Note 1"]);
  } finally {
    await cleanup();
  }
});
