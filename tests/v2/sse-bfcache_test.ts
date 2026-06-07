// Unit tests for the DOM-free logic of src/static/js/sse-bfcache.js.
// Importing the classic-script file runs its IIFE; in Deno `document` is
// undefined so init() (the htmx factory + pagehide/pageshow wiring) is skipped,
// leaving only the window.SseBfcache API to exercise.

import { assert, assertEquals } from "@std/assert";
import "../../src/static/js/sse-bfcache.js";

interface FakeSource {
  readyState: number;
  closed: boolean;
  onerror?: (e: Event) => void;
  close: () => void;
}
interface SseBfcacheApi {
  collectAndClose: (sources: Iterable<FakeSource>) => FakeSource[];
  reconnect: (sources: FakeSource[]) => number;
}

const SseBfcache =
  (globalThis as unknown as { SseBfcache: SseBfcacheApi }).SseBfcache;

const CLOSED = 2;
const OPEN = 1;

function fakeSource(readyState = OPEN): FakeSource {
  return {
    readyState,
    closed: false,
    close() {
      this.closed = true;
      this.readyState = CLOSED;
    },
  };
}

Deno.test("collectAndClose — closes open sources and returns them", () => {
  const a = fakeSource(OPEN);
  const b = fakeSource(OPEN);
  const closed = SseBfcache.collectAndClose(new Set([a, b]));

  assertEquals(closed.length, 2);
  assert(a.closed);
  assert(b.closed);
  assertEquals(a.readyState, CLOSED);
});

Deno.test("collectAndClose — skips already-closed sources", () => {
  const open = fakeSource(OPEN);
  const already = fakeSource(CLOSED);
  const closed = SseBfcache.collectAndClose(new Set([open, already]));

  assertEquals(closed.length, 1);
  assertEquals(closed[0], open);
  assertEquals(already.closed, false); // close() never called on it
});

Deno.test("reconnect — invokes onerror on each source and counts kicks", () => {
  const calls: string[] = [];
  const a = fakeSource(CLOSED);
  a.onerror = () => calls.push("a");
  const b = fakeSource(CLOSED);
  b.onerror = () => calls.push("b");

  const kicked = SseBfcache.reconnect([a, b]);

  assertEquals(kicked, 2);
  assertEquals(calls, ["a", "b"]);
});

Deno.test("reconnect — ignores sources without an onerror handler", () => {
  const withHandler = fakeSource(CLOSED);
  let called = false;
  withHandler.onerror = () => {
    called = true;
  };
  const without = fakeSource(CLOSED); // no onerror

  const kicked = SseBfcache.reconnect([withHandler, without]);

  assertEquals(kicked, 1);
  assert(called);
});

Deno.test("reconnect — a throwing handler does not stop the others", () => {
  const calls: string[] = [];
  const bad = fakeSource(CLOSED);
  bad.onerror = () => {
    throw new Error("boom");
  };
  const good = fakeSource(CLOSED);
  good.onerror = () => calls.push("good");

  const kicked = SseBfcache.reconnect([bad, good]);

  assertEquals(kicked, 1); // only the successful one counts
  assertEquals(calls, ["good"]);
});
