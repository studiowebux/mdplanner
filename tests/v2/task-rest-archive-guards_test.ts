/**
 * REST archive guard suite — Task.
 *
 * Asserts every Task mutation route (API + view layer) returns 422 when
 * the parent task is archived. Read routes stay open per the canonical
 * pattern (archived tasks remain viewable).
 *
 * Bootstrap: initServices(tempdir, { cache: false }) + direct router
 * dispatch via `tasksRouter.request(...)`. No HTTP transport needed —
 * Hono routers handle Request objects directly.
 *
 * Pattern: `[architecture] MD Planner — Soft-delete (archive) pattern`.
 * Reference: `v2/views/strategic-levels/routes.tsx` (commit 9039731).
 */

import { assert, assertEquals } from "@std/assert";
import { tasksRouter as apiRouter } from "../../v2/api/v1/tasks/routes.ts";
import { tasksRouter as viewRouter } from "../../v2/views/tasks/routes.tsx";
import { getTaskService, initServices } from "../../v2/singletons/services.ts";

type RouteCase = {
  name: string;
  method: string;
  path: (id: string) => string;
  body?: unknown;
  contentType?: string;
};

const apiMutations = (id: string): RouteCase[] => [
  {
    name: "PUT /:id",
    method: "PUT",
    path: () => `/${id}`,
    body: { title: "x" },
  },
  { name: "DELETE /:id", method: "DELETE", path: () => `/${id}` },
  {
    name: "POST /:id/claim",
    method: "POST",
    path: () => `/${id}/claim`,
    body: { assignee: "person_1" },
  },
  {
    name: "PATCH /:id/move",
    method: "PATCH",
    path: () => `/${id}/move`,
    body: { section: "In Progress" },
  },
  {
    name: "POST /:id/reorder",
    method: "POST",
    path: () => `/${id}/reorder`,
    body: { afterId: null },
  },
  {
    name: "POST /:id/comments",
    method: "POST",
    path: () => `/${id}/comments`,
    body: { body: "hi" },
  },
  {
    name: "PATCH /:id/attachments",
    method: "PATCH",
    path: () => `/${id}/attachments`,
    body: { paths: ["a.txt"] },
  },
  {
    name: "POST /:id/request-approval",
    method: "POST",
    path: () => `/${id}/request-approval`,
    body: { requestedBy: "person_1", summary: "done" },
  },
  {
    name: "POST /:id/approve",
    method: "POST",
    path: () => `/${id}/approve`,
    body: { decidedBy: "person_1" },
  },
  {
    name: "POST /:id/reject",
    method: "POST",
    path: () => `/${id}/reject`,
    body: { decidedBy: "person_1" },
  },
  {
    name: "POST /:id/time-entries",
    method: "POST",
    path: () => `/${id}/time-entries`,
    body: { date: "2026-05-28", hours: 1 },
  },
  {
    name: "DELETE /:id/time-entries/:entryId",
    method: "DELETE",
    path: () => `/${id}/time-entries/te_x`,
  },
];

const viewMutations = (id: string): RouteCase[] => [
  { name: "POST /:id/complete", method: "POST", path: () => `/${id}/complete` },
  { name: "POST /:id/reopen", method: "POST", path: () => `/${id}/reopen` },
  {
    name: "POST /:id/move",
    method: "POST",
    path: () => `/${id}/move`,
    body: "section=Done",
    contentType: "application/x-www-form-urlencoded",
  },
  {
    name: "POST /:id/assign",
    method: "POST",
    path: () => `/${id}/assign`,
    body: "assignee=person_1",
    contentType: "application/x-www-form-urlencoded",
  },
  {
    name: "POST /:id/comments",
    method: "POST",
    path: () => `/${id}/comments`,
    body: "body=hi",
    contentType: "application/x-www-form-urlencoded",
  },
  {
    name: "POST /:id/github/link-issue",
    method: "POST",
    path: () => `/${id}/github/link-issue`,
    body: "issueNumber=1&githubRepo=x/y",
    contentType: "application/x-www-form-urlencoded",
  },
  {
    name: "POST /:id/github/link-pr",
    method: "POST",
    path: () => `/${id}/github/link-pr`,
    body: "prNumber=1&githubRepo=x/y",
    contentType: "application/x-www-form-urlencoded",
  },
  {
    name: "POST /:id/github/unlink-issue",
    method: "POST",
    path: () => `/${id}/github/unlink-issue`,
  },
  {
    name: "POST /:id/github/unlink-pr",
    method: "POST",
    path: () => `/${id}/github/unlink-pr`,
  },
  {
    name: "POST /:id/reorder",
    method: "POST",
    path: () => `/${id}/reorder`,
    body: JSON.stringify({ afterId: null }),
    contentType: "application/json",
  },
  {
    name: "POST /:id/time-entries (view)",
    method: "POST",
    path: () => `/${id}/time-entries`,
    body: "hours=1&date=2026-05-28",
    contentType: "application/x-www-form-urlencoded",
  },
  {
    name: "DELETE /:id/time-entries/:entryId (view)",
    method: "DELETE",
    path: () => `/${id}/time-entries/te_x`,
  },
];

function buildRequest(base: string, route: RouteCase, id: string): Request {
  const url = `${base}${route.path(id)}`;
  const init: RequestInit = { method: route.method };
  if (route.body !== undefined) {
    if (typeof route.body === "string") {
      init.body = route.body;
      init.headers = {
        "Content-Type": route.contentType ?? "application/json",
      };
    } else {
      init.body = JSON.stringify(route.body);
      init.headers = { "Content-Type": "application/json" };
    }
  }
  return new Request(url, init);
}

Deno.test("REST archive guards — Task mutation routes return 422", async (t) => {
  const dir = await Deno.makeTempDir({
    prefix: "mdplanner-task-rest-guards-",
  });
  initServices(dir, { cache: false });
  const service = getTaskService();

  const target = await service.create({
    title: "Will be archived",
    section: "Todo",
  });
  assertEquals(await service.delete(target.id), true);

  try {
    for (const route of apiMutations(target.id)) {
      await t.step(
        `API ${route.name} returns 422 for archived task`,
        async () => {
          const req = buildRequest("http://localhost", route, target.id);
          const res = await apiRouter.request(req);
          assertEquals(
            res.status,
            422,
            `${route.name} expected 422, got ${res.status}`,
          );
          const body = await res.json();
          assert(
            /archived/i.test(body.message ?? body.error ?? ""),
            `${route.name} body should mention archived: ${
              JSON.stringify(body)
            }`,
          );
        },
      );
    }

    for (const route of viewMutations(target.id)) {
      await t.step(
        `View ${route.name} returns 422 for archived task`,
        async () => {
          const req = buildRequest("http://localhost", route, target.id);
          const res = await viewRouter.request(req);
          assertEquals(
            res.status,
            422,
            `${route.name} expected 422, got ${res.status}`,
          );
        },
      );
    }

    await t.step("API GET /:id remains readable on archived task", async () => {
      const res = await apiRouter.request(`http://localhost/${target.id}`);
      assertEquals(res.status, 200);
      const body = await res.json();
      assertEquals(body.archived, true);
    });

    await t.step(
      "API POST /batch reports archived ids in failed bucket",
      async () => {
        const live = await service.create({
          title: "Live for batch",
          section: "Todo",
        });
        const req = new Request("http://localhost/batch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify([
            { id: target.id, updates: { title: "x" } },
            { id: live.id, updates: { title: "y" } },
          ]),
        });
        const res = await apiRouter.request(req);
        assertEquals(res.status, 200);
        const body = await res.json() as {
          succeeded: Array<{ id: string }>;
          failed: Array<{ id: string; error: string }>;
        };
        assert(
          body.failed.some((f) =>
            f.id === target.id && /archived/i.test(f.error)
          ),
        );
        assert(body.succeeded.some((s) => s.id === live.id));
      },
    );
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});
