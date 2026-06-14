/**
 * Creating a note must land on the new note's editor page, not silently refresh
 * the list (which made the note appear lost). The factory create handler emits
 * `HX-Redirect: /notes/<id>` when the domain config sets `createRedirect`.
 * noteConfig wires it; domains without the hook keep the default 204 + toast.
 */

import { assert, assertEquals } from "@std/assert";
import { notesRouter } from "../../src/views/notes/routes.tsx";
import { getNoteService, initServices } from "../../src/singletons/services.ts";

function createRequest(title: string): Request {
  const form = new URLSearchParams();
  form.append("title", title);
  return new Request("http://localhost/new", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form.toString(),
  });
}

Deno.test("POST /notes/new redirects to the new note's editor", async () => {
  const dir = await Deno.makeTempDir({ prefix: "mdplanner-note-create-" });
  initServices(dir, { cache: false });

  try {
    const res = await notesRouter.request(createRequest("My new note"));
    assertEquals(res.status, 204);

    const redirect = res.headers.get("HX-Redirect");
    assert(redirect, "create response must carry an HX-Redirect header");

    const notes = await getNoteService().list();
    const created = notes.find((n) => n.title === "My new note");
    assert(created, "the note was persisted");
    assertEquals(
      redirect,
      `/notes/${created.id}`,
      "redirect targets the new note's detail/editor page",
    );
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});
