/**
 * Brain-flow archive filter suite — Task.
 *
 * Locks behavior that already falls out of the data-layer ticket: archived
 * tasks are invisible to the brain's ticket-picking loop. Specifically:
 *
 * - `get_next_task` skips archived Todo tasks (auto-filtered via
 *   `service.list({ section: "Todo", ready: true })` → `repo.findAll()`).
 * - `sweep_stale_claims` skips archived In-Progress tasks (auto-filtered
 *   via `repo.findAll()` directly). Archive freezes claim state — sweep
 *   should NOT release claims of archived rows.
 * - `list_pending_approvals` excludes archived tasks (auto-filtered via
 *   `service.list({ section: "Pending Review" })`).
 *
 * `get_context_pack` is currently v1-only (`src/mcp/tools/context-pack.ts`)
 * and is NOT exposed by the v2 MCP server — coverage there will land with
 * the v1→v2 MCP port. Out of scope for this ticket.
 *
 * Pattern: `[architecture] MD Planner — Soft-delete (archive) pattern`.
 */

import { assert, assertEquals, assertExists } from "@std/assert";
import { registerTaskTools } from "../../v2/mcp/tools/tasks.ts";
import {
  getTaskRepository,
  getTaskService,
  initServices,
} from "../../v2/singletons/services.ts";

// deno-lint-ignore no-explicit-any
type Handler = (args: any) => Promise<{ isError?: boolean; content: unknown }>;

class FakeMcpServer {
  tools = new Map<string, Handler>();
  registerTool(
    name: string,
    _config: unknown,
    handler: Handler,
  ): void {
    this.tools.set(name, handler);
  }
}

function okData<T>(result: { content: unknown }): T {
  const c = result.content as Array<{ text: string }>;
  return JSON.parse(c[0].text) as T;
}

Deno.test("brain-flow archive filters — Task", async (t) => {
  const dir = await Deno.makeTempDir({
    prefix: "mdplanner-task-brain-flow-archive-",
  });
  initServices(dir, { cache: false });
  const service = getTaskService();
  const repo = getTaskRepository();

  // deno-lint-ignore no-explicit-any
  const server = new FakeMcpServer() as any;
  registerTaskTools(server);
  const tools: Map<string, Handler> = server.tools;

  try {
    await t.step(
      "get_next_task skips archived Todo tasks",
      async () => {
        const high = await service.create({
          title: "High priority Todo (will be archived)",
          section: "Todo",
          priority: 1,
        });
        const low = await service.create({
          title: "Low priority Todo (live)",
          section: "Todo",
          priority: 3,
        });
        // Archive the higher-priority task.
        assertEquals(await service.delete(high.id), true);

        const handler = tools.get("get_next_task");
        assertExists(handler);
        // agentId / agent_id matches the MCP arg name — get_next_task uses
        // agent_id (snake_case) per tasks.ts.
        const next = okData<{ id: string } | null>(
          await handler!({ agent_id: "person_1" }),
        );
        assertExists(next);
        assertEquals(
          next!.id,
          low.id,
          "next task must skip archived high-priority row",
        );
      },
    );

    await t.step(
      "sweep_stale_claims skips archived In-Progress tasks",
      async () => {
        // Create a Todo, claim it (moves to In Progress + sets claim
        // fields), backdate claimedAt to make it stale, then archive.
        const stale = await service.create({
          title: "Stale claim, then archived",
          section: "Todo",
        });
        await service.claimTask(stale.id, "person_1");
        const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60_000)
          .toISOString();
        await repo.update(stale.id, { claimedAt: twoHoursAgo });
        assertEquals(await service.delete(stale.id), true);

        const handler = tools.get("sweep_stale_claims");
        assertExists(handler);
        // TTL of 0 minutes → every claim older than now is stale.
        const result = okData<{ released: string[]; count: number }>(
          await handler!({ ttl_minutes: 0 }),
        );
        assertEquals(
          result.released.includes(stale.id),
          false,
          "sweep must NOT release archived task claims — archive freezes claim state",
        );
      },
    );

    await t.step(
      "list_pending_approvals excludes archived tasks",
      async () => {
        const live = await service.create({
          title: "Live pending approval",
          section: "Pending Review",
        });
        const archived = await service.create({
          title: "Archived pending approval",
          section: "Pending Review",
        });
        assertEquals(await service.delete(archived.id), true);

        const handler = tools.get("list_pending_approvals");
        assertExists(handler);
        const stubs = okData<Array<{ id: string; title: string }>>(
          await handler!({}),
        );
        assert(stubs.some((s) => s.id === live.id));
        assertEquals(
          stubs.some((s) => s.id === archived.id),
          false,
          "list_pending_approvals must exclude archived tasks",
        );
      },
    );
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});
