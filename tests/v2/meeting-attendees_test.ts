/**
 * Guards the meeting attendees rendering fix (ezob): attendees are stored as
 * person IDs (autocomplete `source: "people"`), so the pill must link directly
 * to `/people/:id` and show the resolved person NAME — not link to a
 * `/people?q=<id>` search with the raw ID, which lands on an invalid id.
 * Unresolved (legacy free-text) values must still fall back to the search link.
 *
 * Renders via the exported AttendeesSection fragment the detail view uses.
 */

import { assert } from "@std/assert";
import { renderToString } from "hono/jsx/dom/server";
import { AttendeesSection } from "../../src/views/meeting-detail.tsx";

Deno.test("resolved attendee links to /people/:id with the person name", () => {
  const html = renderToString(
    AttendeesSection({
      attendees: ["member_pm"],
      attendeeById: { member_pm: { id: "member_pm", name: "Sam Patel" } },
    }),
  );
  assert(
    html.includes('href="/people/member_pm"'),
    "resolved attendee must link directly to the person detail page by id",
  );
  assert(html.includes("Sam Patel"), "pill must show the resolved person name");
  assert(
    !html.includes("/people?q=member_pm"),
    "resolved attendee must not fall back to a search-by-id link",
  );
});

Deno.test("unresolved attendee falls back to a people search by raw value", () => {
  const html = renderToString(
    AttendeesSection({
      attendees: ["Some Guest"],
      attendeeById: {},
    }),
  );
  assert(
    html.includes("/people?q=Some%20Guest"),
    "unresolved attendee links to a people search by the raw value",
  );
  assert(
    html.includes("Some Guest"),
    "unresolved attendee shows the raw value",
  );
});

Deno.test("empty attendees renders nothing", () => {
  const html = renderToString(
    AttendeesSection({ attendees: [], attendeeById: {} }),
  );
  assert(
    !html.includes("Attendees"),
    "no Attendees heading when list is empty",
  );
});
