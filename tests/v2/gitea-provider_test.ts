/**
 * GiteaProvider suite.
 *
 * Verifies the Gitea VCS provider against a stubbed fetch (no live instance):
 * - Base URL is normalized to the `/api/v1` API root.
 * - Auth header uses `token <pat>` (NOT `Bearer`).
 * - Endpoints + response field mapping mirror GitHub via the shared
 *   IGitProvider shape (repos, issues, releases-first).
 */

import { assert, assertEquals } from "@std/assert";
import { giteaApiBase, GiteaProvider } from "../../src/providers/gitea.ts";

type Capture = { url: string; headers: Headers; method: string };

function stubFetch(
  routes: Record<string, unknown>,
  captures: Capture[],
): () => void {
  const original = globalThis.fetch;
  globalThis.fetch = ((input: string | URL | Request, init?: RequestInit) => {
    const url = String(input);
    captures.push({
      url,
      headers: new Headers(init?.headers),
      method: init?.method ?? "GET",
    });
    const path = url.replace(/^https?:\/\/[^/]+/, "");
    const body = routes[path] ?? routes[url] ?? null;
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

Deno.test("giteaApiBase normalizes the configured base URL", () => {
  assertEquals(
    giteaApiBase("https://gitea.example.com"),
    "https://gitea.example.com/api/v1",
  );
  assertEquals(
    giteaApiBase("https://gitea.example.com/"),
    "https://gitea.example.com/api/v1",
  );
  assertEquals(
    giteaApiBase("https://gitea.example.com/api/v1"),
    "https://gitea.example.com/api/v1",
  );
});

Deno.test("GiteaProvider uses token auth + /api/v1 base", async () => {
  const captures: Capture[] = [];
  const restore = stubFetch({
    "/api/v1/user": { login: "tommy" },
  }, captures);
  try {
    const provider = new GiteaProvider("https://gitea.example.com/", "abc123");
    const user = await provider.getAuthenticatedUser();
    assertEquals(user.login, "tommy");
    assertEquals(captures.length, 1);
    assertEquals(
      captures[0].url,
      "https://gitea.example.com/api/v1/user",
    );
    assertEquals(captures[0].headers.get("Authorization"), "token abc123");
  } finally {
    restore();
  }
});

Deno.test("GiteaProvider getRepo maps Gitea fields", async () => {
  const captures: Capture[] = [];
  const restore = stubFetch({
    "/api/v1/repos/acme/web": {
      stars_count: 7,
      open_issues_count: 3,
      updated_at: "2026-06-01T00:00:00Z",
      html_url: "https://gitea.example.com/acme/web",
    },
    "/api/v1/repos/acme/web/pulls?state=open&limit=100": [{ number: 1 }, {
      number: 2,
    }],
  }, captures);
  try {
    const provider = new GiteaProvider("https://gitea.example.com", "t");
    const repo = await provider.getRepo("acme", "web");
    assertEquals(repo.stars, 7);
    assertEquals(repo.openIssues, 3);
    assertEquals(repo.openPRs, 2);
    assertEquals(repo.htmlUrl, "https://gitea.example.com/acme/web");
    assertEquals(repo.lastCommitAt, "2026-06-01T00:00:00Z");
  } finally {
    restore();
  }
});

Deno.test("GiteaProvider getLatestRelease takes the first of the list", async () => {
  const captures: Capture[] = [];
  const restore = stubFetch({
    "/api/v1/repos/acme/web/releases?limit=1": [
      {
        tag_name: "v1.2.0",
        name: "1.2.0",
        published_at: "2026-05-01T00:00:00Z",
        html_url: "https://gitea.example.com/acme/web/releases/tag/v1.2.0",
      },
    ],
  }, captures);
  try {
    const provider = new GiteaProvider("https://gitea.example.com", "t");
    const rel = await provider.getLatestRelease("acme", "web");
    assert(rel !== null);
    assertEquals(rel!.tagName, "v1.2.0");
    assertEquals(
      captures[0].url,
      "https://gitea.example.com/api/v1/repos/acme/web/releases?limit=1",
    );
  } finally {
    restore();
  }
});

Deno.test("GiteaProvider getLatestRelease returns null on empty list", async () => {
  const captures: Capture[] = [];
  const restore = stubFetch({
    "/api/v1/repos/acme/web/releases?limit=1": [],
  }, captures);
  try {
    const provider = new GiteaProvider("https://gitea.example.com", "t");
    assertEquals(await provider.getLatestRelease("acme", "web"), null);
  } finally {
    restore();
  }
});

Deno.test("GiteaProvider listIssues uses Gitea's `assignee` filter (not assigned_by)", async () => {
  const captures: Capture[] = [];
  const restore = stubFetch({
    "/api/v1/repos/acme/web/issues?state=open&type=issues&limit=100&assignee=tommy":
      [
        {
          number: 4,
          title: "Bug",
          state: "open",
          created_at: "2026-06-01T00:00:00Z",
          html_url: "https://gitea.example.com/acme/web/issues/4",
        },
      ],
  }, captures);
  try {
    const provider = new GiteaProvider("https://gitea.example.com", "t");
    const issues = await provider.listIssues("acme", "web", "open", "tommy");
    assertEquals(issues.length, 1);
    assertEquals(issues[0].number, 4);
    assert(
      captures[0].url.includes("&assignee=tommy"),
      "must use Gitea's assignee filter param",
    );
  } finally {
    restore();
  }
});

Deno.test("GiteaProvider Actions degrade honestly (no GitHub-style run API on Gitea)", async () => {
  const captures: Capture[] = [];
  const restore = stubFetch({}, captures);
  try {
    const provider = new GiteaProvider("https://gitea.example.com", "t");
    // Read methods return empty without hitting any endpoint (no 404 noise).
    assertEquals(await provider.listWorkflows(), []);
    assertEquals(await provider.listWorkflowRuns(), {
      runs: [],
      totalCount: 0,
    });
    assertEquals(captures.length, 0);
    // Mutating methods fail with a clear, CI-agnostic message.
    let threw = false;
    try {
      await provider.cancelRun();
    } catch (err) {
      threw = true;
      assert(err instanceof Error);
      assert(/does not expose a workflow-run REST API/.test(err.message));
    }
    assert(threw, "cancelRun must reject on Gitea");
  } finally {
    restore();
  }
});
