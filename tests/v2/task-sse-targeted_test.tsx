// Targeted task-row SSE live-update (perf: narrow the swap scope).
//
// Two layers under test:
//   1. TaskSseRefresh — the view-branched SSE wiring that replaces the generic
//      SseListRefresh for tasks. List view drives a full refetch only on
//      created/moved/deleted and a single-row swap on task.updated; board/
//      timeline view falls back to a full refetch on task.updated too.
//   2. TaskService event taxonomy — a same-section field edit publishes
//      `task.updated` carrying the changed id; a section/completion change
//      publishes `task.moved` with no id (→ full-view refetch).

import { assertEquals, assertStringIncludes } from "@std/assert";
import { renderToString } from "hono/jsx/dom/server";
import { TaskSseRefresh } from "../../src/views/components/task-list.tsx";
import { TaskRepository } from "../../src/repositories/task.repository.ts";
import type { PeopleRepository } from "../../src/repositories/people.repository.ts";
import { TaskService } from "../../src/services/task.service.ts";
import { subscribe } from "../../src/singletons/event-bus.ts";

function countMatches(html: string, needle: string): number {
  return html.split(needle).length - 1;
}

// === TaskSseRefresh — view branching ===

Deno.test("TaskSseRefresh — list view: full refetch on moved/created/deleted + a verb-less task.updated subscriber", () => {
  // deno-lint-ignore no-explicit-any
  const html = renderToString(TaskSseRefresh({ view: "list" }) as any);
  // Full-refetch element fetches the whole view and morphs #tasks-view.
  assertStringIncludes(html, 'hx-get="/tasks/view"');
  assertStringIncludes(html, "sse:task.created");
  assertStringIncludes(html, "sse:task.moved");
  assertStringIncludes(html, "sse:task.deleted");
  // task.updated appears EXACTLY once — on the verb-less subscriber span (no
  // hx-get), never on the full-refetch element. The subscriber is what makes
  // the htmx SSE ext fire htmx:sseMessage for the single-row swap.
  assertEquals(countMatches(html, "sse:task.updated"), 1);
  // Two hidden spans: the refetch element + the subscriber.
  assertEquals(countMatches(html, "<span"), 2);
});

Deno.test("TaskSseRefresh — board view: full refetch on task.updated too, no subscriber span", () => {
  // deno-lint-ignore no-explicit-any
  const html = renderToString(TaskSseRefresh({ view: "board" }) as any);
  assertStringIncludes(html, 'hx-get="/tasks/view"');
  assertStringIncludes(html, "sse:task.updated");
  // Board/timeline rows are not `#task-row-*`, so the single-row swap can't
  // apply — task.updated must drive the full refetch instead, and there is no
  // separate subscriber span.
  assertEquals(countMatches(html, "<span"), 1);
});

Deno.test("TaskSseRefresh — default (no view) behaves as list mode", () => {
  // deno-lint-ignore no-explicit-any
  const html = renderToString(TaskSseRefresh({}) as any);
  assertEquals(countMatches(html, "<span"), 2);
  assertEquals(countMatches(html, "sse:task.updated"), 1);
});

// === TaskService event taxonomy ===

async function setup(): Promise<{ service: TaskService; dir: string }> {
  const dir = await Deno.makeTempDir({ prefix: "mdplanner-sse-tax-test-" });
  const repo = new TaskRepository(dir);
  const people = {} as PeopleRepository;
  return { service: new TaskService(repo, people), dir };
}

async function cleanup(dir: string): Promise<void> {
  try {
    await Deno.remove(dir, { recursive: true });
  } catch {
    // ignore
  }
}

// Subscribe, run a mutation, return the first real SSE message it publishes.
// The stream emits a `: ping` comment on open which we read past first.
async function captureEvent(mutate: () => Promise<unknown>): Promise<string> {
  const reader = subscribe().getReader();
  try {
    await mutate();
    // Skip the `: ping` open comment (and any other comment frames); return the
    // first real `event:` frame this subscriber receives.
    for (let i = 0; i < 5; i++) {
      const { value } = await reader.read();
      if (value && value.startsWith("event:")) return value;
    }
    return "";
  } finally {
    reader.cancel();
  }
}

Deno.test("TaskService.update — field-only edit publishes task.updated with the id", async () => {
  const { service, dir } = await setup();
  try {
    const t = await service.create({ title: "Row swap", section: "Todo" });
    const msg = await captureEvent(() =>
      service.update(t.id, { title: "Renamed" })
    );
    assertStringIncludes(msg, "event: task.updated");
    assertStringIncludes(msg, `"id":"${t.id}"`);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("TaskService.update — section change publishes task.moved with no id", async () => {
  const { service, dir } = await setup();
  try {
    const t = await service.create({ title: "Move me", section: "Todo" });
    const msg = await captureEvent(() =>
      service.update(t.id, { section: "Done" })
    );
    assertStringIncludes(msg, "event: task.moved");
    // No payload → the client does a full-view refetch (cannot relocate a row).
    assertStringIncludes(msg, "data: \n");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("TaskService.update — completion toggle publishes task.moved", async () => {
  const { service, dir } = await setup();
  try {
    const t = await service.create({ title: "Complete me", section: "Todo" });
    const msg = await captureEvent(() =>
      service.update(t.id, { completed: true, section: "Done" })
    );
    assertStringIncludes(msg, "event: task.moved");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("TaskService.addComment — same-section edit publishes task.updated with the id", async () => {
  const { service, dir } = await setup();
  try {
    const t = await service.create({ title: "Comment me", section: "Todo" });
    const msg = await captureEvent(() => service.addComment(t.id, "hello"));
    assertStringIncludes(msg, "event: task.updated");
    assertStringIncludes(msg, `"id":"${t.id}"`);
  } finally {
    await cleanup(dir);
  }
});
