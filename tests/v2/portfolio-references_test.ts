/**
 * Portfolio detail "References" section (QOL): the detail page lists tasks and
 * notes that name this project as compact grouped links — references only, not
 * full data. Covers the pure gather helper (project match, archived exclusion,
 * id/title projection) and the section render (links, grouping, empty hide).
 */

import { assert, assertEquals } from "@std/assert";
import { gatherProjectReferences } from "../../src/views/portfolio/helpers.ts";
import type { ProjectReferences } from "../../src/views/portfolio/helpers.ts";
import { ReferencesSection } from "../../src/views/portfolio-detail.tsx";

type Args = Parameters<typeof gatherProjectReferences>;

async function render(
  node: ReturnType<typeof ReferencesSection>,
): Promise<string> {
  if (node == null) return "";
  return String(await node.toString());
}

const tasks = [
  { id: "t1", title: "Build grid", project: "MDPlanner", archived: false },
  { id: "t2", title: "Other proj", project: "Something Else" },
  { id: "t3", title: "Archived one", project: "MDPlanner", archived: true },
  { id: "t4", title: "Case match", project: "mdplanner" },
] as unknown as Args[1];

const notes = [
  { id: "n1", title: "Design note", project: "MDPlanner" },
  { id: "n2", title: "No project" },
] as unknown as Args[2];

Deno.test("gatherProjectReferences matches by project (case-insensitive), skips archived + others", () => {
  const refs = gatherProjectReferences("MDPlanner", tasks, notes);
  assertEquals(refs.tasks.map((t) => t.id), ["t1", "t4"]);
  assertEquals(refs.notes.map((n) => n.id), ["n1"]);
  assertEquals(refs.tasks[0], { id: "t1", title: "Build grid" });
});

Deno.test("ReferencesSection renders grouped links to /tasks and /notes", async () => {
  const refs: ProjectReferences = {
    tasks: [{ id: "t1", title: "Build grid" }],
    notes: [{ id: "n1", title: "Design note" }],
  };
  const html = await render(ReferencesSection({ references: refs }));
  assert(html.includes('href="/tasks/t1"'), "links the task by id");
  assert(html.includes('href="/notes/n1"'), "links the note by id");
  assert(html.includes("Build grid"), "shows task title");
  assert(html.includes("Tasks (1)"), "groups + counts tasks");
  assert(html.includes("Notes (1)"), "groups + counts notes");
});

Deno.test("ReferencesSection renders nothing when there are no references", async () => {
  const html = await render(
    ReferencesSection({ references: { tasks: [], notes: [] } }),
  );
  assertEquals(html, "");
});
