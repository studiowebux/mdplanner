/**
 * MCP slim suite — Portfolio.
 *
 * Asserts `list_portfolio { slim: true }` returns compact rows (id, name,
 * status, category, progress only) while the default full mode is unchanged.
 * Mirrors the list_tasks slim option (src/mcp/tools/tasks/crud.ts) and the
 * captured-handler FakeMcpServer harness from task-mcp-archive-guards_test.ts.
 */

import { assert, assertEquals, assertExists } from "@std/assert";
import { registerPortfolioTools } from "../../src/mcp/tools/portfolio.ts";
import {
  getPortfolioService,
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

Deno.test("MCP slim — list_portfolio slim returns compact rows, full mode unchanged", async (t) => {
  const dir = await Deno.makeTempDir({
    prefix: "mdplanner-portfolio-mcp-slim-",
  });
  initServices(dir, { cache: false });
  const service = getPortfolioService();

  // deno-lint-ignore no-explicit-any
  const server = new FakeMcpServer() as any;
  registerPortfolioTools(server);
  const tools: Map<string, Handler> = server.tools;

  try {
    await service.create({
      name: "MDPlanner",
      category: "SaaS Products",
      status: "active",
      description: "A modern project management platform",
      progress: 65,
      revenue: 125000,
      expenses: 45000,
    });

    const handler = tools.get("list_portfolio");
    assertExists(handler);

    await t.step("slim:true returns only the compact fields", async () => {
      const rows = okData<Array<Record<string, unknown>>>(
        await handler!({ slim: true }),
      );
      assertEquals(rows.length, 1);
      assertEquals(Object.keys(rows[0]).sort(), [
        "category",
        "id",
        "name",
        "progress",
        "status",
      ]);
      assertEquals(rows[0].name, "MDPlanner");
      assertEquals(rows[0].progress, 65);
      // Heavy fields are dropped in slim mode.
      assert(!("revenue" in rows[0]));
      assert(!("description" in rows[0]));
    });

    await t.step("default (full) mode keeps the heavy fields", async () => {
      const rows = okData<Array<Record<string, unknown>>>(await handler!({}));
      assertEquals(rows.length, 1);
      assertEquals(rows[0].revenue, 125000);
      assertEquals(rows[0].description, "A modern project management platform");
    });
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});
