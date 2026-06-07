/**
 * SSE event-bus suite.
 * Covers subscribe/publish and closeAll() — the latter ends every open stream
 * so a graceful server shutdown can drain promptly instead of blocking on
 * EventSources that never complete on their own (bug task_1780783265433).
 */

import { assertEquals } from "@std/assert";
import {
  closeAll,
  publish,
  subscribe,
} from "../../src/singletons/event-bus.ts";

Deno.test("subscribe enqueues an initial ping, then receives published events", async () => {
  const reader = subscribe().getReader();

  const ping = await reader.read();
  assertEquals(ping.done, false);
  assertEquals(ping.value, ": ping\n\n");

  publish("tasks.updated");
  const event = await reader.read();
  assertEquals(event.done, false);
  assertEquals(event.value, "event: tasks.updated\ndata: \n\n");

  closeAll();
  await reader.cancel();
});

Deno.test("publish serializes a payload when provided", async () => {
  const reader = subscribe().getReader();
  await reader.read(); // drain the initial ping

  publish("note.updated", { id: "n1" });
  const event = await reader.read();
  assertEquals(event.value, 'event: note.updated\ndata: {"id":"n1"}\n\n');

  closeAll();
  await reader.cancel();
});

Deno.test("closeAll ends every open stream", async () => {
  const a = subscribe().getReader();
  const b = subscribe().getReader();
  await a.read(); // drain pings
  await b.read();

  closeAll();

  const aDone = await a.read();
  const bDone = await b.read();
  assertEquals(aDone.done, true);
  assertEquals(bDone.done, true);
});

Deno.test("publish after closeAll reaches no subscribers (Set cleared)", async () => {
  const reader = subscribe().getReader();
  await reader.read(); // drain ping

  closeAll();
  // The subscriber is gone; publishing must not throw and the stream stays done.
  publish("tasks.updated");

  const after = await reader.read();
  assertEquals(after.done, true);
});
