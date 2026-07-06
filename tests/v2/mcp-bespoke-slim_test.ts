/**
 * MCP slim projection — bespoke (hand-written) list tools.
 *
 * The heavy hand-written list_* tools (not on registerCrudTools) gained a
 * `slim: true` compact projection via the shared projectSlim/slimParam helpers
 * (src/mcp/utils.ts). These tests register each tool on a FakeMcpServer, create
 * one entity, and assert slim returns id + the declared fields (guarding the
 * chosen slimFields against the real entity shape) while full mode is unchanged.
 */

import { assert, assertEquals, assertExists } from "@std/assert";
import { registerIdeaTools } from "../../src/mcp/tools/ideas.ts";
import { registerMindmapTools } from "../../src/mcp/tools/mindmaps.ts";
import { registerPeopleTools } from "../../src/mcp/tools/people.ts";
import { registerFinanceTools } from "../../src/mcp/tools/finances.ts";
import {
  getFinanceService,
  getIdeaService,
  getMindmapService,
  getPeopleService,
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

Deno.test("MCP slim — bespoke list tools project the declared fields", async (t) => {
  const dir = await Deno.makeTempDir({ prefix: "mdplanner-bespoke-slim-" });
  initServices(dir, { cache: false });

  // deno-lint-ignore no-explicit-any
  const server = new FakeMcpServer() as any;
  registerIdeaTools(server);
  registerMindmapTools(server);
  registerPeopleTools(server);
  registerFinanceTools(server);
  const tools: Map<string, Handler> = server.tools;

  try {
    await getIdeaService().create({
      title: "Big idea",
      status: "new",
      category: "feature",
      priority: "high",
      project: "MDPlanner",
      description: "Heavy description dropped in slim.",
    });
    await t.step("list_ideas slim", async () => {
      const rows = okData<Array<Record<string, unknown>>>(
        await tools.get("list_ideas")!({ slim: true }),
      );
      assertEquals(Object.keys(rows[0]).sort(), [
        "category",
        "id",
        "priority",
        "project",
        "status",
        "title",
      ]);
      assert(!("description" in rows[0]));
    });

    await getMindmapService().create({
      title: "Map",
      project: "MDPlanner",
    });
    await t.step("list_mindmaps slim drops the node tree", async () => {
      const rows = okData<Array<Record<string, unknown>>>(
        await tools.get("list_mindmaps")!({ slim: true }),
      );
      assertEquals(Object.keys(rows[0]).sort(), ["id", "project", "title"]);
      assert(!("nodes" in rows[0]));
    });

    await getPeopleService().create({
      name: "Ada",
      title: "Engineer",
      role: "developer",
    });
    await t.step("list_people slim", async () => {
      const rows = okData<Array<Record<string, unknown>>>(
        await tools.get("list_people")!({ slim: true }),
      );
      assertEquals(rows[0].name, "Ada");
      assert("role" in rows[0]);
      assert(!("preferences" in rows[0]));
    });

    await getFinanceService().create({
      title: "Server bill",
      type: "expense",
      amount: 42,
      currency: "USD",
      date: "2026-06-01",
    });
    await t.step("list_finances slim", async () => {
      const rows = okData<Array<Record<string, unknown>>>(
        await tools.get("list_finances")!({ slim: true }),
      );
      assertEquals(Object.keys(rows[0]).sort(), [
        "amount",
        "currency",
        "date",
        "id",
        "title",
        "type",
      ]);
    });

    await t.step("full mode (no slim) keeps everything", async () => {
      const rows = okData<Array<Record<string, unknown>>>(
        await tools.get("list_finances")!({}),
      );
      assertEquals(rows[0].amount, 42);
    });
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});
