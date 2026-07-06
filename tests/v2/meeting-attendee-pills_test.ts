/**
 * Guards the meeting list attendee-link fix (iyba): the list card + table
 * pills must link resolved attendees to /people/:id by name, and only fall
 * back to a /people?q= search for unresolved values — never link a raw person
 * ID to /people?q=<id> (which lands on no match).
 *
 * Renders the shared AttendeePills component the card + table both use.
 */

import { assert } from "@std/assert";
import { renderToString } from "hono/jsx/dom/server";
import { AttendeePills } from "../../src/views/components/meeting-attendee-pills.tsx";
import type { ResolvedAttendee } from "../../src/domains/meeting/owners.ts";

Deno.test("resolved attendee links to /people/:id by name", () => {
  const attendeeById: Record<string, ResolvedAttendee> = {
    person_123: { id: "person_123", name: "Alice Doe" },
  };
  const html = renderToString(
    AttendeePills({ attendees: ["person_123"], attendeeById }),
  );
  assert(
    html.includes('href="/people/person_123"'),
    "resolved attendee should link to /people/:id",
  );
  assert(html.includes("Alice Doe"), "resolved attendee should show the name");
  assert(
    !html.includes("/people?q=person_123"),
    "resolved attendee must NOT use the id search fallback",
  );
});

Deno.test("unresolved attendee falls back to people search", () => {
  const html = renderToString(
    AttendeePills({ attendees: ["Bob Legacy"], attendeeById: {} }),
  );
  assert(
    html.includes("/people?q=Bob%20Legacy"),
    "unresolved attendee should fall back to /people?q=",
  );
  assert(
    html.includes("Bob Legacy"),
    "unresolved attendee shows the raw value",
  );
});

Deno.test("overflow badge appears beyond three attendees", () => {
  const attendees = ["a", "b", "c", "d", "e"];
  const html = renderToString(AttendeePills({ attendees, attendeeById: {} }));
  assert(html.includes("+2"), "two hidden attendees should render a +2 badge");
  assert(
    html.includes("meeting-attendees-overflow"),
    "overflow badge keeps its styling hook",
  );
});
