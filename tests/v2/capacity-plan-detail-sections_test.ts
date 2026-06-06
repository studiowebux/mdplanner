// Render tests for the capacity-plan-detail sections extracted from the view:
// the grid (incl. the flattened GridCell popup) and the two sidenav forms.
// Asserts the htmx element ids + structure survive the split-out.

import { assertStringIncludes } from "@std/assert";
import { renderToString } from "hono/jsx/dom/server";
import { CapacityGrid } from "../../src/views/components/capacity-plan-detail-grid.tsx";
import {
  AllocationForm,
  MemberForm,
} from "../../src/views/components/capacity-plan-detail-forms.tsx";
import type {
  GridRow,
  WeekCol,
} from "../../src/views/capacity-plan-detail.tsx";

const weeks: WeekCol[] = [{ label: "W1", monday: "2026-06-01" }];

Deno.test("CapacityGrid — empty rows show the placeholder", () => {
  const html = renderToString(
    // deno-lint-ignore no-explicit-any
    CapacityGrid({ weeks, rows: [] }) as any,
  );
  assertStringIncludes(html, "Capacity Grid");
  assertStringIncludes(html, "Add team members and allocations");
});

Deno.test("CapacityGrid — renders a cell popup with task links", () => {
  const rows: GridRow[] = [{
    personId: "p1",
    personName: "Ada",
    cells: {
      "2026-06-01": {
        plannedHours: 20,
        taskHours: 12,
        tasks: [{ id: "t1", title: "Build", hours: 12 }],
      },
    },
    totalPlanned: 20,
    totalTask: 12,
  }];
  const html = renderToString(
    // deno-lint-ignore no-explicit-any
    CapacityGrid({ weeks, rows }) as any,
  );
  assertStringIncludes(html, "/people/p1");
  assertStringIncludes(html, "capacity-plan-detail__cell-popup");
  assertStringIncludes(html, "/tasks/t1");
  assertStringIncludes(html, "Build");
});

Deno.test("MemberForm — keeps member post target + autocomplete ids", () => {
  const html = renderToString(
    MemberForm({
      planId: "plan1",
      personOptions: [],
      // deno-lint-ignore no-explicit-any
    }) as any,
  );
  assertStringIncludes(html, "/capacity-plans/plan1/members");
  assertStringIncludes(html, 'id="member-personId"');
  assertStringIncludes(html, 'id="member-workingDays"');
});

Deno.test("AllocationForm — edit mode targets the allocation id", () => {
  const html = renderToString(
    AllocationForm({
      planId: "plan1",
      memberOptions: [],
      targetOptions: [],
      allocId: "a9",
      // deno-lint-ignore no-explicit-any
    }) as any,
  );
  assertStringIncludes(html, "/capacity-plans/plan1/allocations/a9");
  assertStringIncludes(html, 'id="alloc-targetType"');
  assertStringIncludes(html, "Save");
});
