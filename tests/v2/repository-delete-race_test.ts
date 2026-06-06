/**
 * Delete↔update concurrency — no resurrection.
 *
 * Locks the fix for task_1780764138531: a concurrent `update(id)` must never
 * resurrect an entity that a `hardDelete(id)` removed. Both repositories
 * (standalone TaskRepository and BaseMarkdownRepository) now perform the
 * read-modify-write of `update` entirely inside the per-id `SafeWriter` lock,
 * so update and hardDelete on the same id are fully serialized:
 *   - delete wins the lock first → update's resolve finds nothing → no write.
 *   - update wins the lock first → it writes, then delete removes the file.
 * Either ordering ends with the entity gone.
 *
 * Before the fix, `update` resolved the file OUTSIDE the lock, then wrote a
 * stale snapshot back inside it — so a delete that interleaved between the read
 * and the write left the entity resurrected on disk.
 *
 * Many iterations exercise the nondeterministic interleaving.
 */

import { assert, assertEquals } from "@std/assert";
import {
  getGoalService,
  getTaskService,
  initServices,
} from "../../src/singletons/services.ts";

const ITERATIONS = 40;

Deno.test("concurrent update‖hardDelete never resurrects the entity", async (t) => {
  const dir = await Deno.makeTempDir({ prefix: "mdplanner-delete-race-" });
  initServices(dir, { cache: false });

  try {
    await t.step("TaskRepository (standalone, board sections)", async () => {
      const tasks = getTaskService();
      for (let i = 0; i < ITERATIONS; i++) {
        const task = await tasks.create({
          title: `race ${i}`,
          section: "Todo",
        });
        await Promise.all([
          tasks.update(task.id, { title: `race ${i} edited` }),
          tasks.hardDelete(task.id),
        ]);
        assertEquals(
          await tasks.getById(task.id),
          null,
          `task ${task.id} resurrected after concurrent update+hardDelete`,
        );
      }
    });

    await t.step("BaseMarkdownRepository (goal)", async () => {
      const goals = getGoalService();
      for (let i = 0; i < ITERATIONS; i++) {
        const goal = await goals.create({
          title: `race ${i}`,
          type: "project",
        });
        await Promise.all([
          goals.update(goal.id, { title: `race ${i} edited` }),
          goals.hardDelete(goal.id),
        ]);
        assertEquals(
          await goals.getById(goal.id),
          null,
          `goal ${goal.id} resurrected after concurrent update+hardDelete`,
        );
      }
    });

    await t.step(
      "section-move update during delete does not resurrect at the new path",
      async () => {
        const tasks = getTaskService();
        for (let i = 0; i < ITERATIONS; i++) {
          const task = await tasks.create({
            title: `move-race ${i}`,
            section: "Todo",
          });
          await Promise.all([
            tasks.update(task.id, { section: "Done" }),
            tasks.hardDelete(task.id),
          ]);
          const survivor = await tasks.getById(task.id);
          assert(
            survivor === null,
            `task ${task.id} resurrected (section move) after concurrent delete`,
          );
        }
      },
    );
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});
