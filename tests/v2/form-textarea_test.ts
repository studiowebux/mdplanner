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
