// Render tests for the shared FormTextarea component and its portfolio
// consumers. Guards the form__textarea base class (auto-grow + correct sizing)
// so textareas never regress to the .form__input fixed-height anti-pattern.

import { assertStringIncludes } from "@std/assert";
import { assertEquals } from "@std/assert";
import { renderToString } from "hono/jsx/dom/server";
import { FormTextarea } from "../../src/views/components/form-textarea.tsx";
import {
  StatusUpdateEditRow,
  StatusUpdateForm,
} from "../../src/views/portfolio-detail.tsx";
import { HabitHeatmap } from "../../src/views/habits/components/habit-heatmap.tsx";
import { CommentsSection } from "../../src/views/task-detail.tsx";
import { NewBoardForm } from "../../src/views/sticky-notes/routes.tsx";
import { MindmapEditForm } from "../../src/views/mindmap-detail.tsx";

Deno.test("FormTextarea — carries the form__textarea base class, not form__input", () => {
  // deno-lint-ignore no-explicit-any
  const html = renderToString(FormTextarea({ name: "message" }) as any);
  assertStringIncludes(html, 'class="form__textarea"');
  assertEquals(html.includes("form__input"), false);
});

Deno.test("FormTextarea — appends extra class and renders value as children", () => {
  const html = renderToString(
    // deno-lint-ignore no-explicit-any
    FormTextarea({
      name: "note",
      class: "custom__modifier",
      value: "hi",
    }) as any,
  );
  assertStringIncludes(html, 'class="form__textarea custom__modifier"');
  assertStringIncludes(html, ">hi</textarea>");
});

Deno.test("FormTextarea — forwards attrs (hx-*/data-*) and standard props", () => {
  const html = renderToString(
    FormTextarea({
      name: "body",
      id: "comment-body",
      rows: 4,
      required: true,
      attrs: { "data-mentions": "", "hx-post": "/x" },
      // deno-lint-ignore no-explicit-any
    }) as any,
  );
  assertStringIncludes(html, 'id="comment-body"');
  assertStringIncludes(html, 'rows="4"');
  assertStringIncludes(html, "data-mentions");
  assertStringIncludes(html, 'hx-post="/x"');
});

Deno.test("StatusUpdateForm — add box uses form__textarea, keeps required + post target", () => {
  // deno-lint-ignore no-explicit-any
  const html = renderToString(StatusUpdateForm({ itemId: "p1" }) as any);
  assertStringIncludes(html, "form__textarea");
  assertEquals(html.includes("form__input"), false);
  assertStringIncludes(html, "/portfolio/p1/status-updates");
  assertStringIncludes(html, "required");
});

Deno.test("StatusUpdateEditRow — edit textarea uses form__textarea with value", () => {
  const html = renderToString(
    StatusUpdateEditRow({
      itemId: "p1",
      u: { id: "u1", date: "2026-06-08", message: "shipped" },
      // deno-lint-ignore no-explicit-any
    }) as any,
  );
  assertStringIncludes(html, "form__textarea");
  assertEquals(html.includes("form__input"), false);
  assertStringIncludes(html, "shipped");
});

Deno.test("CommentsSection — comment box uses form__textarea, keeps data-mentions + reset-on-success", () => {
  const html = renderToString(
    CommentsSection({
      taskId: "task_1",
      comments: [],
      mentionOpts: {},
      people: [],
      // deno-lint-ignore no-explicit-any
    }) as any,
  );
  assertStringIncludes(html, "form__textarea");
  assertStringIncludes(html, "task-detail__comment-input");
  assertEquals(html.includes("form__input"), false);
  assertStringIncludes(html, "data-mentions");
  assertStringIncludes(html, "data-reset-on-success");
  assertStringIncludes(html, 'id="comment-body-task_1"');
});

Deno.test("NewBoardForm — description box uses form__textarea, drops the redundant form__input combo", () => {
  // deno-lint-ignore no-explicit-any
  const html = renderToString(NewBoardForm({}) as any);
  assertStringIncludes(html, "form__textarea");
  assertStringIncludes(html, 'id="sboard-description"');
  // The textarea must no longer carry the fixed-height form__input combo.
  assertEquals(html.includes("form__input form__textarea"), false);
  // Create-board wiring survives.
  assertStringIncludes(html, 'hx-post="/sticky-notes/boards"');
});

Deno.test("MindmapEditForm — body box uses form__textarea + modifier, keeps spellcheck + save target", () => {
  const html = renderToString(
    // deno-lint-ignore no-explicit-any
    MindmapEditForm({ id: "mm1", bodyText: "- root" }) as any,
  );
  assertStringIncludes(html, "form__textarea mindmap-edit-form__textarea");
  assertEquals(html.includes("form__input"), false);
  assertStringIncludes(html, 'spellcheck="false"');
  assertStringIncludes(html, ">- root</textarea>");
  assertStringIncludes(html, 'hx-post="/mindmaps/mm1/body"');
});

Deno.test("HabitHeatmap — note box uses form__textarea, not the bogus form-input class", () => {
  // deno-lint-ignore no-explicit-any
  const html = renderToString(HabitHeatmap({ habits: [] }) as any);
  assertStringIncludes(html, "form__textarea");
  assertStringIncludes(html, "habit-note-form__textarea");
  // The bogus single-dash `form-input` token must be gone.
  assertEquals(html.includes('class="form-input'), false);
});
