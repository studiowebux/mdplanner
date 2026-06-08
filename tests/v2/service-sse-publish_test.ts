// Service-layer SSE publish (g3ayps). Business logic — including the SSE
// broadcast — lives in the services, so a mutation arriving via ANY interface
// (REST, MCP) live-refreshes connected browsers. These tests subscribe to the
// in-process event bus and assert the service mutation emits the expected
// `<ssePrefix>.updated` / `.deleted` event.
//
// Two paths are covered:
//  - standalone TaskService (hardcoded prefix, publishes from its own methods),
//  - a BaseService-derived domain (goal) whose prefix is wired in initServices
//    from the authoritative SSE_PREFIX_BY_KEY map.

import { assert, assertStringIncludes } from "@std/assert";
import { subscribe } from "../../src/singletons/event-bus.ts";
import {
  getGoalService,
  getTaskService,
  initServices,
} from "../../src/singletons/services.ts";

/** Subscribe, drain the initial ": ping", and return a reader of decoded SSE text. */
async function openBus(): Promise<ReadableStreamDefaultReader<string>> {
  const reader = subscribe().getReader();
  await reader.read(); // ": ping\n\n" emitted on subscribe
  return reader;
}

Deno.test("service SSE publish — standalone TaskService.create emits task.updated", async () => {
  const dir = await Deno.makeTempDir({ prefix: "mdplanner-sse-task-" });
  initServices(dir, { cache: false });
  const reader = await openBus();
  try {
    await getTaskService().create({ title: "Live", section: "Todo" });
    const { value } = await reader.read();
    assert(value, "expected an SSE message after create");
    assertStringIncludes(value, "event: task.updated");
  } finally {
    reader.releaseLock();
    await Deno.remove(dir, { recursive: true });
  }
});

Deno.test("service SSE publish — standalone TaskService.delete emits task.deleted", async () => {
  const dir = await Deno.makeTempDir({ prefix: "mdplanner-sse-taskdel-" });
  initServices(dir, { cache: false });
  const svc = getTaskService();
  const task = await svc.create({ title: "Doomed", section: "Todo" });
  const reader = await openBus();
  try {
    await svc.delete(task.id);
    const { value } = await reader.read();
    assert(value, "expected an SSE message after delete");
    assertStringIncludes(value, "event: task.deleted");
  } finally {
    reader.releaseLock();
    await Deno.remove(dir, { recursive: true });
  }
});

Deno.test("service SSE publish — BaseService domain prefix wired in initServices", async () => {
  const dir = await Deno.makeTempDir({ prefix: "mdplanner-sse-goal-" });
  initServices(dir, { cache: false });
  const reader = await openBus();
  try {
    await getGoalService().create({ title: "Ship it", type: "project" });
    const { value } = await reader.read();
    assert(value, "expected an SSE message after create");
    assertStringIncludes(value, "event: goal.updated");
  } finally {
    reader.releaseLock();
    await Deno.remove(dir, { recursive: true });
  }
});
