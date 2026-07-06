/**
 * Woodpecker CI service/provider routing (WoodpeckerService).
 *
 * Woodpecker is a CI engine, separate from the VCS providers: its own host +
 * token, addressed by numeric repo id. A portfolio item's `owner/repo` slug is
 * resolved via `/repos/lookup/{owner}/{repo}` → id, then pipelines are read
 * from `/repos/{id}/pipelines`. Auth is `Authorization: Bearer <token>`. When
 * no base URL is configured, methods throw WOODPECKER_NOT_CONFIGURED.
 */

import { assert, assertEquals, assertRejects } from "@std/assert";
import { WoodpeckerService } from "../../src/services/woodpecker.service.ts";
import type { ProjectService } from "../../src/services/project.service.ts";
import type { ProjectConfig } from "../../src/types/project.types.ts";

/** Minimal ProjectService whose getConfig returns the supplied config. */
function fakeProjectService(config: Partial<ProjectConfig>): ProjectService {
  return {
    getConfig: () => Promise.resolve(config as ProjectConfig),
  } as unknown as ProjectService;
}

interface Captured {
  url: string;
  auth: string | null;
}

/**
 * Stub fetch: records each request and routes by path. `/repos/lookup/...`
 * returns a repo with a numeric id; pipeline endpoints return a pipeline body
 * so mapping can be asserted.
 */
function stubFetch(captured: Captured[]): () => void {
  const original = globalThis.fetch;
  globalThis.fetch = ((input: string | URL | Request, init?: RequestInit) => {
    const url = String(input);
    const headers = new Headers(init?.headers);
    captured.push({ url, auth: headers.get("Authorization") });

    let body: unknown = {};
    if (url.includes("/repos/lookup/")) {
      body = { id: 42, full_name: "myorg/my-app", name: "my-app" };
    } else if (url.includes("/pipelines")) {
      const pipeline = {
        number: 7,
        status: "success",
        event: "push",
        branch: "main",
        message: "ci: green",
        created: 1700000000,
      };
      // A specific pipeline number/latest → object; list → array.
      body = /\/pipelines\/?($|\?)/.test(url) ? [pipeline] : pipeline;
    } else if (url.includes("/user/repos")) {
      body = [{ id: 42, full_name: "myorg/my-app", name: "my-app" }];
    }

    return Promise.resolve(
      new Response(JSON.stringify(body), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
  }) as typeof fetch;
  return () => {
    globalThis.fetch = original;
  };
}

const CONFIGURED: Partial<ProjectConfig> = {
  woodpeckerBaseUrl: "https://ci.example.com",
  woodpeckerToken: "wp-token",
};

Deno.test("listPipelines resolves the slug to a repo id, then hits /pipelines with Bearer auth", async () => {
  const captured: Captured[] = [];
  const restore = stubFetch(captured);
  try {
    const svc = new WoodpeckerService(fakeProjectService(CONFIGURED));
    const pipelines = await svc.listPipelines("myorg/my-app", 5);

    const urls = captured.map((c) => c.url);
    assert(
      urls.some((u) =>
        u.includes("https://ci.example.com/api/repos/lookup/myorg/my-app")
      ),
      `expected a lookup call, got: ${urls.join(", ")}`,
    );
    assert(
      urls.some((u) =>
        u.includes("https://ci.example.com/api/repos/42/pipelines?perPage=5")
      ),
      `expected a /repos/42/pipelines call, got: ${urls.join(", ")}`,
    );
    assertEquals(
      captured.every((c) => c.auth === "Bearer wp-token"),
      true,
      "every request carries the Bearer token",
    );
    assertEquals(pipelines.length, 1);
    assertEquals(pipelines[0].number, 7);
    assertEquals(pipelines[0].status, "success");
    assertEquals(pipelines[0].createdAt, "2023-11-14T22:13:20.000Z");
  } finally {
    restore();
  }
});

Deno.test("getPipeline('latest') hits /repos/{id}/pipelines/latest", async () => {
  const captured: Captured[] = [];
  const restore = stubFetch(captured);
  try {
    const svc = new WoodpeckerService(fakeProjectService(CONFIGURED));
    const pipeline = await svc.getPipeline("myorg/my-app", "latest");
    assert(
      captured.some((c) => c.url.endsWith("/api/repos/42/pipelines/latest")),
      `expected a /pipelines/latest call, got: ${
        captured.map((c) => c.url).join(", ")
      }`,
    );
    assertEquals(pipeline.number, 7);
  } finally {
    restore();
  }
});

Deno.test("listRepos hits /user/repos with the configured token", async () => {
  const captured: Captured[] = [];
  const restore = stubFetch(captured);
  try {
    const svc = new WoodpeckerService(fakeProjectService(CONFIGURED));
    const repos = await svc.listRepos();
    assert(captured.some((c) => c.url.includes("/api/user/repos")));
    assertEquals(repos[0].fullName, "myorg/my-app");
  } finally {
    restore();
  }
});

Deno.test("methods throw WOODPECKER_NOT_CONFIGURED when no base URL is set", async () => {
  const svc = new WoodpeckerService(fakeProjectService({}));
  await assertRejects(
    () => svc.listPipelines("myorg/my-app"),
    Error,
    "WOODPECKER_NOT_CONFIGURED",
  );
});

Deno.test("isConfigured reflects the presence of a base URL", async () => {
  assertEquals(
    await new WoodpeckerService(fakeProjectService(CONFIGURED)).isConfigured(),
    true,
  );
  assertEquals(
    await new WoodpeckerService(fakeProjectService({})).isConfigured(),
    false,
  );
});
