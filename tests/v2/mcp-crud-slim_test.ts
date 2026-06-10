/**
 * MCP slim projection — registerCrudTools factory.
 *
 * The factory exposes `slim: true` on the list tool for domains that declare
 * `slimFields`. slim returns `{ id, ...slimFields }` per row; full mode is
 * unchanged. Covers a representative factory domain (goals) end-to-end plus a
 * second (briefs) to lock the per-domain projection. Mirrors
 * portfolio-mcp-slim_test.ts.
 */

import { assert, assertEquals, assertExists } from "@std/assert";
import { registerGoalTools } from "../../src/mcp/tools/goals.ts";
import { registerBriefTools } from "../../src/mcp/tools/briefs.ts";
import {
  getBriefService,
  getGoalService,
  initServices,
} from "../../src/singletons/services.ts";

// deno-lint-ignore no-explicit-any
type Handler = (args: any) => Promise<{ isError?: boolean; content: unknown }>;

class FakeMcpServer {
  tools = new Map<string, Handler>();
  registerTool(name: string, _config: unknown, handler: Handler): void {
    this.tools.set(name, handler);
  }
}

function okData<T>(result: { content: unknown }): T {
  const c = result.content as Array<{ text: string }>;
  return JSON.parse(c[0].text) as T;
}

Deno.test("MCP slim — factory list tool projects slimFields, full mode unchanged", async (t) => {
  const dir = await Deno.makeTempDir({ prefix: "mdplanner-crud-slim-" });
  initServices(dir, { cache: false });
  const goals = getGoalService();
  const briefs = getBriefService();

  // deno-lint-ignore no-explicit-any
  const server = new FakeMcpServer() as any;
  registerGoalTools(server);
  registerBriefTools(server);
  const tools: Map<string, Handler> = server.tools;

  try {
    await goals.create({
      title: "Ship v2",
      status: "on-track",
      type: "project",
      progress: 40,
      project: "MDPlanner",
      description: "A heavy description field that slim must drop.",
    });

    const listGoals = tools.get("list_goals");
    assertExists(listGoals);

    await t.step(
      "goals slim returns id + declared slimFields only",
      async () => {
        const rows = okData<Array<Record<string, unknown>>>(
          await listGoals!({ slim: true }),
        );
        assertEquals(rows.length, 1);
        assertEquals(Object.keys(rows[0]).sort(), [
          "id",
          "progress",
          "project",
          "status",
          "title",
          "type",
        ]);
        assertEquals(rows[0].title, "Ship v2");
        assertEquals(rows[0].progress, 40);
        assert(!("description" in rows[0]));
      },
    );

    await t.step("goals full mode keeps heavy fields", async () => {
      const rows = okData<Array<Record<string, unknown>>>(
        await listGoals!({}),
      );
      assertEquals(rows.length, 1);
      assertEquals(
        rows[0].description,
        "A heavy description field that slim must drop.",
      );
    });

    await briefs.create({
      title: "Q3 brief",
      date: "2026-07-01",
      summary: ["Heavy summary text dropped in slim mode."],
      mission: ["Heavy mission text."],
    });

    const listBriefs = tools.get("list_briefs");
    assertExists(listBriefs);

    await t.step("briefs slim projects only title + date", async () => {
      const rows = okData<Array<Record<string, unknown>>>(
        await listBriefs!({ slim: true }),
      );
      assertEquals(rows.length, 1);
      assertEquals(Object.keys(rows[0]).sort(), ["date", "id", "title"]);
      assert(!("summary" in rows[0]));
      assert(!("mission" in rows[0]));
    });
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});
