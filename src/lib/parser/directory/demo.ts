/**
 * Demo script for directory-based parser.
 * Run with: deno run --allow-read --allow-write src/lib/parser/directory/demo.ts
 */
import { DirectoryMarkdownParser } from "./parser.ts";

const DEMO_DIR = "./demo_project";

async function main() {
  console.log("Directory-Based Parser Demo\n");

  // Initialize parser
  const parser = new DirectoryMarkdownParser(DEMO_DIR);

  // Initialize project structure
  console.log("1. Initializing project structure...");
  await parser.initialize("Demo Project");
  console.log(`   Created: ${DEMO_DIR}/`);
  console.log(`   Created: ${DEMO_DIR}/project.md`);
  console.log(`   Created: ${DEMO_DIR}/notes/`);
  console.log(`   Created: ${DEMO_DIR}/goals/`);
  console.log(`   Created: ${DEMO_DIR}/board/todo/`);
  console.log(`   Created: ${DEMO_DIR}/board/in_progress/`);
  console.log(`   Created: ${DEMO_DIR}/board/done/`);

  // Add a note
  console.log("\n2. Adding a note...");
  const note = await parser.addNote(
    "Project Overview",
    "This is a demo project to test the directory-based parser.\n\nIt stores each item in a separate markdown file.",
    "simple"
  );
  console.log(`   Created: ${DEMO_DIR}/notes/${note.id}.md`);
  console.log(`   Title: ${note.title}`);

  // Add a goal
  console.log("\n3. Adding a goal...");
  const goal = await parser.addGoal({
    title: "Complete Migration",
    description: "Migrate all features to directory-based storage",
    type: "project",
    kpi: "All parsers implemented",
    startDate: "2026-02-15",
    endDate: "2026-03-01",
    status: "on-track",
  });
  console.log(`   Created: ${DEMO_DIR}/goals/${goal.id}.md`);
  console.log(`   Title: ${goal.title}`);

  // Add tasks
  console.log("\n4. Adding tasks...");
  const task1 = await parser.addTask(
    "Implement CanvasDirectoryParser",
    "Todo",
    { priority: 1, effort: 3, tag: ["Backend", "Parser"] },
    ["Create parser for sticky notes", "Support position and color"]
  );
  console.log(`   Created: ${DEMO_DIR}/board/todo/${task1.id}.md`);

  const task2 = await parser.addTask(
    "Implement MindmapsDirectoryParser",
    "Todo",
    { priority: 2, effort: 4, tag: ["Backend", "Parser"] }
  );
  console.log(`   Created: ${DEMO_DIR}/board/todo/${task2.id}.md`);

  const task3 = await parser.addTask(
    "Write unit tests",
    "In Progress",
    { priority: 1, effort: 2, tag: ["Testing"] },
    ["Test YAML frontmatter parsing", "Test each parser"]
  );
  console.log(`   Created: ${DEMO_DIR}/board/in_progress/${task3.id}.md`);

  // Read back all data
  console.log("\n5. Reading project info...");
  const projectInfo = await parser.readProjectInfo();
  console.log(`   Project: ${projectInfo.name}`);
  console.log(`   Notes: ${projectInfo.notes.length}`);
  console.log(`   Goals: ${projectInfo.goals.length}`);

  console.log("\n6. Reading tasks...");
  const tasks = await parser.readTasks();
  console.log(`   Total tasks: ${tasks.length}`);
  for (const t of tasks) {
    console.log(`   - [${t.section}] ${t.title}`);
  }

  // Move a task
  console.log("\n7. Moving task to Done...");
  await parser.moveTask(task1.id, "Done");
  console.log(`   Moved: ${task1.title} -> Done`);

  // Verify move
  const updatedTasks = await parser.readTasks();
  const movedTask = updatedTasks.find((t) => t.id === task1.id);
  console.log(`   New section: ${movedTask?.section}`);

  // Read sections
  console.log("\n8. Reading sections...");
  const sections = await parser.readSections();
  console.log(`   Sections: ${sections.join(", ")}`);

  // Add sticky notes
  console.log("\n9. Adding sticky notes...");
  const sticky1 = await parser.addStickyNote(
    "Remember to update docs",
    "yellow",
    { x: 100, y: 50 }
  );
  console.log(`   Created: ${DEMO_DIR}/canvas/${sticky1.id}.md`);

  const sticky2 = await parser.addStickyNote(
    "Bug: Fix login issue",
    "pink",
    { x: 300, y: 50 },
    { width: 200, height: 150 }
  );
  console.log(`   Created: ${DEMO_DIR}/canvas/${sticky2.id}.md`);

  // Update sticky note position
  console.log("\n10. Moving sticky note...");
  await parser.updateStickyNotePosition(sticky1.id, { x: 150, y: 100 });
  console.log(`   Moved: ${sticky1.id} to (150, 100)`);

  // Add mindmap
  console.log("\n11. Adding mindmap...");
  const mindmap = await parser.addMindmap("Project Architecture", "Main App");
  console.log(`   Created: ${DEMO_DIR}/mindmaps/${mindmap.id}.md`);

  // Add nodes to mindmap
  console.log("\n12. Adding mindmap nodes...");
  const rootNode = mindmap.nodes[0];
  await parser.addMindmapNode(mindmap.id, "Frontend", rootNode.id);
  await parser.addMindmapNode(mindmap.id, "Backend", rootNode.id);
  await parser.addMindmapNode(mindmap.id, "Database", rootNode.id);
  console.log(`   Added 3 child nodes under "${rootNode.text}"`);

  // Read back all data
  console.log("\n13. Reading all canvas and mindmap data...");
  const stickyNotes = await parser.readStickyNotes();
  const mindmaps = await parser.readMindmaps();
  console.log(`   Sticky notes: ${stickyNotes.length}`);
  console.log(`   Mindmaps: ${mindmaps.length}`);
  if (mindmaps.length > 0) {
    console.log(`   First mindmap nodes: ${mindmaps[0].nodes.length}`);
  }

  console.log("\n✓ Demo complete!");
  console.log(`\nCheck ${DEMO_DIR}/ to see the generated files.`);
}

main().catch(console.error);
