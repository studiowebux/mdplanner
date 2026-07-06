/**
 * StickyNoteService.count() guard.
 *
 * The board card grid uses count() instead of list().length to avoid building
 * full StickyNote entities per board. This locks the contract: count() must
 * equal list().length and exclude archived (soft-deleted) notes, so the board
 * card badge stays consistent with the canvas (which also uses list()).
 */

import { assertEquals } from "@std/assert";
import {
  getStickyNoteServiceForBoard,
  initServices,
} from "../../src/singletons/services.ts";

Deno.test("StickyNoteService.count() equals list().length, excludes archived", async () => {
  const dir = await Deno.makeTempDir({ prefix: "mdplanner-sticky-count-" });
  initServices(dir, { cache: false });

  try {
    const svc = getStickyNoteServiceForBoard("default");
    const a = await svc.create({ content: "A" });
    await svc.create({ content: "B" });
    await svc.create({ content: "C" });

    assertEquals(await svc.count(), 3);
    assertEquals((await svc.list()).length, 3);

    // Soft-delete one — count must drop and still match list().length.
    await svc.archive(a.id);
    assertEquals(await svc.count(), 2);
    assertEquals((await svc.list()).length, 2);
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});
