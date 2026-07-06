/**
 * Virtual milestone detail resolution — getByIdOrVirtual.
 *
 * Tasks can reference a milestone NAME that has no backing milestone file
 * (e.g. a raw id-string set as the milestone). `list()` surfaces these as
 * "virtual" milestones with a slugified id (underscores → dashes), but
 * `getById` can't find them (no file) so the detail page used to 404 — the
 * "stuck" milestones reported in live testing. getByIdOrVirtual resolves them.
 */

import { assertEquals } from "@std/assert";
import {
  getMilestoneService,
  getTaskService,
  initServices,
} from "../../src/singletons/services.ts";

Deno.test("getByIdOrVirtual resolves a virtual (fileless) milestone by slug id", async () => {
  const dir = await Deno.makeTempDir({
    prefix: "mdplanner-virtual-milestone-",
  });
  initServices(dir, { cache: false });

  try {
    const milestones = getMilestoneService();
    const tasks = getTaskService();

    // A task referencing a milestone NAME that is itself a raw id-string, with
    // no backing milestone file → surfaced as a virtual milestone.
    const ref = "milestone_1780863616335_jf755b";
    await tasks.create({ title: "Linked", section: "Todo", milestone: ref });

    // The virtual milestone's id is the slug of its name.
    const slug = ref.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(
      /^-|-$/g,
      "",
    );
    assertEquals(slug, "milestone-1780863616335-jf755b");

    // It appears in the list with that slug id and the raw name.
    const all = await milestones.list();
    const virtual = all.find((m) => m.id === slug);
    assertEquals(virtual?.name, ref);
    assertEquals(virtual?.taskCount, 1);

    // getById can't find it (no file) → the 404 cause.
    assertEquals(await milestones.getById(slug), null);

    // getByIdOrVirtual resolves it → detail page renders instead of 404.
    const resolved = await milestones.getByIdOrVirtual(slug);
    assertEquals(resolved?.id, slug);
    assertEquals(resolved?.name, ref);
    assertEquals(resolved?.taskCount, 1);
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});

Deno.test("getByIdOrVirtual still resolves a real milestone by its file id", async () => {
  const dir = await Deno.makeTempDir({ prefix: "mdplanner-real-milestone-" });
  initServices(dir, { cache: false });

  try {
    const milestones = getMilestoneService();
    const created = await milestones.create({
      name: "Real One",
      status: "open",
    });
    const resolved = await milestones.getByIdOrVirtual(created.id);
    assertEquals(resolved?.id, created.id);
    assertEquals(resolved?.name, "Real One");
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});
