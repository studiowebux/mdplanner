/**
 * Guards the uploads table markup against regressing to the bespoke
 * row/cell variant. The body rows/cells must use the canonical .data-table
 * component (`data-table__row` / `data-table__td`) so they inherit shared
 * striping, hover, and border handling — and the filename must sit in an inner
 * `.uploads__file-name` flex wrapper, never `display:flex` on the <td> itself
 * (which knocked the first column's border out of alignment).
 *
 * Renders the real view with the same renderToString the routes use.
 */

import { assert } from "@std/assert";
import { renderToString } from "hono/jsx/dom/server";
import { FilesTable } from "../../src/views/uploads.tsx";
import type { UploadedFile } from "../../src/views/uploads.tsx";

const files: UploadedFile[] = [
  {
    taskId: "t1",
    taskTitle: "Task One",
    filename: "spec.pdf",
    relPath: "uploads/t1/spec.pdf",
    sizeBytes: 2048,
    mtime: new Date("2026-05-01T00:00:00.000Z"),
    isDangling: false,
  },
  {
    taskId: "t2",
    taskTitle: "Task Two",
    filename: "orphan.png",
    relPath: "uploads/t2/orphan.png",
    sizeBytes: 4096,
    mtime: new Date("2026-05-02T00:00:00.000Z"),
    isDangling: true,
  },
];

function render(): string {
  return renderToString(FilesTable({ files, filter: "all" }));
}

Deno.test("uploads table uses the canonical data-table component", () => {
  const html = render();

  // Canonical body rows/cells.
  assert(html.includes("data-table__row"), "rows must use data-table__row");
  assert(html.includes("data-table__td"), "cells must use data-table__td");

  // No regression to the bespoke base classes (modifiers like --size are ok).
  assert(
    !/class="[^"]*\buploads__row(?!--)/.test(html),
    "body rows must not use the bespoke uploads__row base class",
  );
  assert(
    !/class="[^"]*\buploads__td(?!--)/.test(html),
    "body cells must not use the bespoke uploads__td base class",
  );
});

Deno.test("uploads filename sits in an inner flex wrapper, not a flex td", () => {
  const html = render();
  assert(
    html.includes("uploads__file-name"),
    "filename + badge must be wrapped in .uploads__file-name (keeps the td a real table cell)",
  );
});

Deno.test("uploads dangling row keeps its warning modifier", () => {
  const html = render();
  assert(
    html.includes("uploads__row--dangling"),
    "dangling rows must carry the uploads__row--dangling modifier",
  );
});
