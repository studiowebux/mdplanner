/**
 * Guards the meeting "Action Items" UX fixes (1ak6):
 * - the status control is a clear "Mark done" / "Reopen" toggle (not a bare
 *   status-text badge), carrying data-status for the at-a-glance dot;
 * - the add-action form inputs use the styled `.form__input` class, never the
 *   undefined `.input` class that left them browser-default and misaligned.
 *
 * Renders via the exported renderActionsTable fragment helper the routes use.
 */

import { assert } from "@std/assert";
import { renderActionsTable } from "../../src/views/meeting-detail.tsx";
import type { Meeting } from "../../src/types/meeting.types.ts";

function meetingWith(status: "open" | "done"): Meeting {
  return {
    id: "meeting_test",
    actions: [
      {
        id: "a1",
        description: "Ship the thing",
        owner: "bob",
        due: "2026-06-10",
        status,
      },
    ],
    // renderActionsTable only reads id + actions; rest is unused.
    // deno-lint-ignore no-explicit-any
  } as any;
}

Deno.test("action status toggle reads 'Mark done' when open", () => {
  const html = renderActionsTable(meetingWith("open"), { bob: "Bob" });
  assert(html.includes("Mark done"), "open action should offer 'Mark done'");
  assert(
    !html.includes(">open<"),
    "raw status text 'open' should not be the control label",
  );
  assert(
    html.includes('data-status="open"'),
    "toggle should carry data-status for the status dot",
  );
  assert(
    html.includes("meeting-detail__action-toggle"),
    "status control should be the labeled toggle button",
  );
});

Deno.test("action status toggle reads 'Reopen' when done", () => {
  const html = renderActionsTable(meetingWith("done"), { bob: "Bob" });
  assert(html.includes("Reopen"), "done action should offer 'Reopen'");
  assert(
    html.includes('data-status="done"'),
    "toggle should carry data-status=done",
  );
});

Deno.test("add-action form uses styled form inputs, not the undefined .input class", () => {
  const html = renderActionsTable(meetingWith("open"), { bob: "Bob" });
  assert(html.includes("form__input"), "add-form inputs must use .form__input");
  assert(
    !/class="input(\s|")/.test(html),
    "add-form must not use the undefined .input class (browser-default styling)",
  );
  assert(
    html.includes('aria-label="Due date"'),
    "the date input must be labelled (it had no label/placeholder before)",
  );
});
