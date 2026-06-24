/**
 * Per-project VCS routing (GitHubService).
 *
 * Hosting is a property of the portfolio item (`vcsProvider`), NOT a global
 * config switch: each call passes the item's provider and the service targets
 * that backend. With BOTH GitHub and Gitea configured, a github-hosted project
 * hits api.github.com and a gitea-hosted one hits the Gitea /api/v1 root.
 * Absent choice defaults to GitHub; Gitea is opt-in per item, so configuring
 * Gitea never reroutes unset items and both providers coexist.
 */

import { assert, assertEquals } from "@std/assert";
import { GitHubService } from "../../src/services/github.service.ts";
import type { ProjectService } from "../../src/services/project.service.ts";
import type { ProjectConfig } from "../../src/types/project.types.ts";

/** Minimal ProjectService whose getConfig returns the supplied config. */
function fakeProjectService(config: Partial<ProjectConfig>): ProjectService {
  return {
    getConfig: () => Promise.resolve(config as ProjectConfig),
  } as unknown as ProjectService;
}

/** Capture the first fetched URL, return an empty-but-valid JSON body. */
function stubFetch(urls: string[]): () => void {
  const original = globalThis.fetch;
  globalThis.fetch = ((input: string | URL | Request) => {
    urls.push(String(input));
    return Promise.resolve(
      new Response(JSON.stringify({}), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
  }) as typeof fetch;
  return () => {
    globalThis.fetch = original;
  };
}

const BOTH_CONFIGURED: Partial<ProjectConfig> = {
  githubToken: "gh-token",
  giteaBaseUrl: "https://gitea.example.com",
  giteaToken: "gitea-token",
};

Deno.test("getRepo routes a github-hosted project to api.github.com", async () => {
  const urls: string[] = [];
  const restore = stubFetch(urls);
  try {
    const svc = new GitHubService(fakeProjectService(BOTH_CONFIGURED));
    await svc.getRepo("owner/repo", "github");
  } finally {
    restore();
  }
  assert(
    urls.some((u) => u.includes("api.github.com")),
    `expected a github.com call, got: ${urls.join(", ")}`,
  );
  assert(!urls.some((u) => u.includes("gitea.example.com")), "no gitea call");
});

Deno.test("getRepo routes a gitea-hosted project to the gitea /api/v1 root", async () => {
  const urls: string[] = [];
  const restore = stubFetch(urls);
  try {
    const svc = new GitHubService(fakeProjectService(BOTH_CONFIGURED));
    await svc.getRepo("owner/repo", "gitea");
  } finally {
    restore();
  }
  assert(
    urls.some((u) => u.includes("gitea.example.com/api/v1")),
    `expected a gitea /api/v1 call, got: ${urls.join(", ")}`,
  );
  assert(!urls.some((u) => u.includes("api.github.com")), "no github call");
});

Deno.test("absent provider defaults to github even when gitea is configured", () => {
  assertEquals(
    new GitHubService(fakeProjectService(BOTH_CONFIGURED))
      .activeProviderName(),
    "GitHub",
  );
});

Deno.test("absent provider defaults to github when gitea is unconfigured", () => {
  assertEquals(
    new GitHubService(fakeProjectService({ githubToken: "gh" }))
      .activeProviderName(),
    "GitHub",
  );
});

Deno.test("explicit choice overrides the github default", () => {
  const svc = new GitHubService(fakeProjectService(BOTH_CONFIGURED));
  assertEquals(svc.activeProviderName("github"), "GitHub");
  assertEquals(svc.activeProviderName("gitea"), "Gitea");
});
