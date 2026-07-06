/**
 * Bounded-drain shutdown suite (ticket ix0b4b).
 *
 * Proves runShutdown always exits — even when the server drain never settles
 * (the hang bug: long-lived /sse + MCP keep-alive connections) — and that it
 * does not wait the full budget when the drain finishes early.
 */

import { assert, assertEquals } from "@std/assert";
import { runShutdown } from "../../src/utils/shutdown.ts";

const DRAIN_MS = 40;

Deno.test("runShutdown — forces exit when the drain never resolves", async () => {
  let exitCode: number | undefined;
  const order: string[] = [];

  const start = performance.now();
  await runShutdown({
    notify: () => order.push("notify"),
    flushMs: 0,
    closeStreams: () => order.push("close"),
    // Never resolves — simulates an SSE/MCP connection that never closes.
    drain: () => new Promise<void>(() => {}),
    drainMs: DRAIN_MS,
    exit: (code) => {
      exitCode = code;
    },
  });
  const elapsed = performance.now() - start;

  assertEquals(exitCode, 0, "must exit(0) despite the stuck drain");
  assertEquals(order, ["notify", "close"], "notify then close, in order");
  assert(
    elapsed >= DRAIN_MS && elapsed < DRAIN_MS * 10,
    `should force exit near the drain budget, took ${elapsed}ms`,
  );
});

Deno.test("runShutdown — exits promptly when the drain resolves early", async () => {
  let exitCode: number | undefined;

  const start = performance.now();
  await runShutdown({
    notify: () => {},
    flushMs: 0,
    closeStreams: () => {},
    drain: () => Promise.resolve(),
    drainMs: 5000, // large budget; must NOT be waited out
    exit: (code) => {
      exitCode = code;
    },
  });
  const elapsed = performance.now() - start;

  assertEquals(exitCode, 0);
  assert(elapsed < 1000, `must not wait the full budget, took ${elapsed}ms`);
});

Deno.test("runShutdown — still exits cleanly when the drain rejects", async () => {
  let exitCode: number | undefined;
  let logged = "";

  await runShutdown({
    notify: () => {},
    flushMs: 0,
    closeStreams: () => {},
    drain: () => Promise.reject(new Error("boom")),
    drainMs: DRAIN_MS,
    exit: (code) => {
      exitCode = code;
    },
    log: (msg) => {
      logged += msg;
    },
  });

  assertEquals(exitCode, 0);
  assert(logged.includes("drain failed"), "rejection is logged, not thrown");
});
