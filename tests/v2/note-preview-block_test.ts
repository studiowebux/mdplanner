/**
 * Block preview (htmx) suite — Note editor.
 *
 * Locks the /notes/preview-block contract after the fetch→htmx conversion:
 * - Accepts a form-encoded body (htmx default), not JSON.
 * - text blocks render markdown to HTML.
 * - code blocks are wrapped server-side in <pre><code> (optionally with a
 *   language-<lang> class) with the content HTML-escaped — the editor no
 *   longer renders code previews client-side.
 *
 * Replaces the former previewBlock() fetch path (JSON {content}).
 */

import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import { notesRouter as viewRouter } from "../../src/views/notes/routes.tsx";
import { initServices } from "../../src/singletons/services.ts";

function formRequest(fields: [string, string][]): Request {
  const form = new URLSearchParams();
  for (const [k, v] of fields) form.append(k, v);
  return new Request("http://localhost/preview-block", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form.toString(),
  });
}

Deno.test("preview-block — htmx form contract", async (t) => {
  const dir = await Deno.makeTempDir({ prefix: "mdplanner-note-preview-" });
  initServices(dir, { cache: false });

  try {
    await t.step("text block renders markdown to HTML", async () => {
      const res = await viewRouter.request(
        formRequest([["content", "**bold**"], ["type", "text"]]),
      );
      assertEquals(res.status, 200);
      const html = await res.text();
      assertStringIncludes(html, "<strong>bold</strong>");
      assert(
        !html.includes("<pre><code"),
        "text blocks must not be wrapped as code",
      );
    });

    await t.step(
      "code block is wrapped server-side and HTML-escaped",
      async () => {
        const res = await viewRouter.request(
          formRequest([
            ["content", "<script>alert(1)</script>"],
            ["type", "code"],
            ["lang", "js"],
          ]),
        );
        assertEquals(res.status, 200);
        const html = await res.text();
        assertStringIncludes(html, '<pre><code class="language-js">');
        assertStringIncludes(html, "&lt;script&gt;alert(1)&lt;/script&gt;");
        assert(
          !html.includes("<script>alert(1)</script>"),
          "code content must be escaped, never emitted raw",
        );
      },
    );

    await t.step(
      "code block without lang omits the language class",
      async () => {
        const res = await viewRouter.request(
          formRequest([["content", "const x = 1;"], ["type", "code"]]),
        );
        assertEquals(res.status, 200);
        const html = await res.text();
        assertStringIncludes(html, "<pre><code>const x = 1;</code></pre>");
      },
    );
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});
