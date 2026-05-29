/**
 * MCP archive guard suite — Task.
 *
 * Asserts every Task mutation MCP tool rejects archived task IDs with an
 * `isError: true` result and a message containing "archived". Also verifies
 * the `list_tasks { archived: true }` opt-in.
 *
 * Bootstrap: initServices(tempdir, { cache: false }) gives us the real
 * TaskService through the singleton. A captured-handler fake McpServer
 * records each `registerTool` call so the test can drive handlers directly
 * without needing the full SDK transport.
 *
 * Pattern: `[architecture] MD Planner — Soft-delete (archive) pattern`.
 * Reference guard: `v2/mcp/tools/strategic-levels.ts` (commit 9039731).
 */

import { assert, assertEquals, assertExists } from "@std/assert";
import { registerTaskTools } from "../../v2/mcp/tools/tasks.ts";
import { getTaskService, initServices } from "../../v2/singletons/services.ts";

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

function isErr(result: { isError?: boolean; content: unknown }): boolean {
  return result.isError === true;
}

function errText(result: { content: unknown }): string {
  const c = result.content as Array<{ text: string }>;
  return c[0]?.text ?? "";
}

function okData<T>(result: { content: unknown }): T {
  const c = result.content as Array<{ text: string }>;
  return JSON.parse(c[0].text) as T;
}

Deno.test("MCP archive guards — Task mutation tools reject archived ids", async (t) => {
  const dir = await Deno.makeTempDir({
    prefix: "mdplanner-task-mcp-guards-",
  });
  initServices(dir, { cache: false });
  const service = getTaskService();

  // deno-lint-ignore no-explicit-any
  const server = new FakeMcpServer() as any;
  registerTaskTools(server);
  const tools: Map<string, Handler> = server.tools;

  const target = await service.create({
    title: "Will be archived",
    section: "Todo",
  });
  const live = await service.create({
    title: "Stays live",
    section: "Todo",
  });
  // service.delete = repo.archive (canonical alias). Archive the target.
  const archived = await service.delete(target.id);
  assertEquals(archived, true);

  try {
    // Each entry: tool name → minimal args that include the archived task id.
    const mutations: Array<{ name: string; args: Record<string, unknown> }> = [
      { name: "update_task", args: { id: target.id, title: "new" } },
      { name: "delete_task", args: { id: target.id } },
      {
        name: "claim_task",
        args: { id: target.id, assignee: "person_1" },
      },
      { name: "move_task", args: { id: target.id, section: "In Progress" } },
      { name: "add_task_comment", args: { id: target.id, comment: "hi" } },
      {
        name: "add_task_attachments",
        args: { id: target.id, paths: ["a.txt"] },
      },
      {
        name: "request_approval",
        args: {
          id: target.id,
          requestedBy: "person_1",
          summary: "done",
        },
      },
      {
        name: "approve_task",
        args: { id: target.id, decidedBy: "person_1" },
      },
      {
        name: "reject_task",
        args: { id: target.id, decidedBy: "person_1" },
      },
      {
        name: "create_time_entry",
        args: { id: target.id, date: "2026-05-28", hours: 1 },
      },
      {
        name: "delete_time_entry",
        args: { id: target.id, entryId: "te_x" },
      },
      {
        name: "github_link_issue",
        args: { id: target.id, githubRepo: "x/y", issueNumber: 1 },
      },
      {
        name: "github_link_pr",
        args: { id: target.id, githubRepo: "x/y", prNumber: 1 },
      },
      {
        name: "github_unlink",
        args: { id: target.id },
      },
    ];

    for (const { name, args } of mutations) {
      await t.step(`${name} rejects archived task`, async () => {
        const handler = tools.get(name);
        assertExists(handler, `tool ${name} not registered`);
        const result = await handler!(args);
        assertEquals(isErr(result), true, `${name} should return isError`);
        assert(
          /archived/i.test(errText(result)),
          `${name} error should mention archived, got: ${errText(result)}`,
        );
      });
    }

    await t.step(
      "batch_update_tasks reports archived ids in failed bucket",
      async () => {
        const handler = tools.get("batch_update_tasks");
        assertExists(handler);
        const result = await handler!({
          updates: [
            { id: target.id, updates: { title: "x" } },
            { id: live.id, updates: { title: "y" } },
          ],
        });
        assertEquals(isErr(result), false);
        const data = okData<{
          updated: number;
          total: number;
          results: Array<{ id: string; success: boolean; error?: string }>;
        }>(result);
        assertEquals(data.total, 2);
        const archivedRow = data.results.find((r) => r.id === target.id);
        assertExists(archivedRow);
        assertEquals(archivedRow!.success, false);
        assert(/archived/i.test(archivedRow!.error ?? ""));
        const liveRow = data.results.find((r) => r.id === live.id);
        assertExists(liveRow);
        assertEquals(liveRow!.success, true);
      },
    );

    await t.step(
      "list_tasks default excludes archived; archived:true returns archived only",
      async () => {
        const handler = tools.get("list_tasks");
        assertExists(handler);

        const defaultList = okData<Array<{ id: string }>>(
          await handler!({}),
        );
        assertEquals(
          defaultList.some((t) => t.id === target.id),
          false,
          "default list_tasks must exclude archived",
        );
        assert(defaultList.some((t) => t.id === live.id));

        const archivedList = okData<Array<{ id: string }>>(
          await handler!({ archived: true }),
        );
        assertEquals(archivedList.length, 1);
        assertEquals(archivedList[0].id, target.id);
      },
    );
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});
