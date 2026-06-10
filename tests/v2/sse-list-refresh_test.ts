// SseListRefresh is the domain list-view background refresh element. It must
// carry its OWN hx-get: htmx 2.x does not inherit the request verb from <main>,
// so a span relying on inheritance fires the SSE trigger but issues no request
// and the list never refreshes (the mark-complete no-live-update bug). These
// assertions lock the self-contained attributes in place.

import { assertStringIncludes } from "@std/assert";
import { renderToString } from "hono/jsx/dom/server";
import { SseListRefresh } from "../../src/views/components/sse-refresh.tsx";

Deno.test("SseListRefresh — carries its own hx-get (verb not inherited)", () => {
  const html = renderToString(
    // deno-lint-ignore no-explicit-any
    SseListRefresh({ name: "tasks", ssePrefix: "task" }) as any,
  );
  // The verb MUST be on the element itself — this is the bug fix.
  assertStringIncludes(html, 'hx-get="/tasks/view"');
  assertStringIncludes(html, 'hx-target="#tasks-view"');
  assertStringIncludes(html, 'hx-swap="morph:outerHTML"');
  assertStringIncludes(html, 'hx-include="#tasks-toolbar"');
  assertStringIncludes(html, "hx-indicator=");
  assertStringIncludes(html, "hidden");
});

Deno.test("SseListRefresh — listens on created/updated/deleted for the prefix", () => {
  const html = renderToString(
    // deno-lint-ignore no-explicit-any
    SseListRefresh({ name: "goals", ssePrefix: "goal" }) as any,
  );
  assertStringIncludes(html, "sse:goal.created");
  assertStringIncludes(html, "sse:goal.updated");
  assertStringIncludes(html, "sse:goal.deleted");
  assertStringIncludes(html, 'hx-get="/goals/view"');
});

Deno.test("SseListRefresh — debounces SSE triggers to coalesce mutation bursts", () => {
  const html = renderToString(
    // deno-lint-ignore no-explicit-any
    SseListRefresh({ name: "tasks", ssePrefix: "task" }) as any,
  );
  // delay:200ms on each trigger collapses a bulk-mutation storm into one
  // trailing refetch instead of one full /view morph per event.
  assertStringIncludes(html, "sse:task.created delay:200ms");
  assertStringIncludes(html, "sse:task.updated delay:200ms");
  assertStringIncludes(html, "sse:task.deleted delay:200ms");
});
