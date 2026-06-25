/**
 * Guards the My Work "Git" card body (8a6ldj): MyGitCard renders my open PRs,
 * review-requested PRs, assigned issues, and CI-needs-attention as labeled
 * subsections with outbound links + status pills, hides empty subsections, and
 * shows a friendly message when everything is empty.
 */

import { assert } from "@std/assert";
import { renderToString } from "hono/jsx/dom/server";
import {
  MyGitCard,
  type MyGitData,
} from "../../src/views/components/my-git-list.tsx";

const base: MyGitData = {
  myPRs: [],
  reviewRequested: [],
  assignedIssues: [],
  ciAttention: [],
};

Deno.test("all-empty renders the nothing message", () => {
  const html = renderToString(MyGitCard(base));
  assert(html.includes("Nothing assigned to you right now."));
  assert(!html.includes("me-git__group"), "no subsections when empty");
});

Deno.test("my PRs render with state pill and link", () => {
  const html = renderToString(MyGitCard({
    ...base,
    myPRs: [{
      repo: "acme/web",
      number: 12,
      title: "Add login",
      state: "open",
      htmlUrl: "https://github.com/acme/web/pull/12",
    }],
  }));
  assert(html.includes("My open PRs (1)"));
  assert(html.includes("Add login"));
  assert(html.includes('href="https://github.com/acme/web/pull/12"'));
  assert(html.includes("badge--success"), "open PR → success variant");
  assert(html.includes("acme/web #12"));
});

Deno.test("review-requested and assigned issues render their sections", () => {
  const html = renderToString(MyGitCard({
    ...base,
    reviewRequested: [{
      repo: "acme/api",
      number: 7,
      title: "Refactor",
      state: "open",
      htmlUrl: "https://gitea.local/acme/api/pulls/7",
    }],
    assignedIssues: [{
      repo: "acme/api",
      number: 99,
      title: "Bug: crash",
      htmlUrl: "https://gitea.local/acme/api/issues/99",
    }],
  }));
  assert(html.includes("Review requested (1)"));
  assert(html.includes("Assigned issues (1)"));
  assert(html.includes("Bug: crash"));
  assert(html.includes('href="https://gitea.local/acme/api/issues/99"'));
});

Deno.test("CI attention renders status pill linking to the forge", () => {
  const html = renderToString(MyGitCard({
    ...base,
    ciAttention: [{
      repo: "acme/web",
      number: 42,
      status: "failure",
      branch: "main",
      forgeUrl: "https://ci.local/repos/9",
    }],
  }));
  assert(html.includes("CI needs attention (1)"));
  assert(html.includes("badge--error"), "failure → error variant");
  assert(html.includes('href="https://ci.local/repos/9"'));
  assert(html.includes("acme/web · main"));
});
