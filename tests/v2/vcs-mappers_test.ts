/**
 * Guards the shared VCS mappers (extracted from byte-identical mapIssue/mapPR
 * copies in gitea.ts + github.ts): field coercion, closed-state normalization,
 * merged detection, reviewer filtering, and null-actor handling.
 */

import { assertEquals } from "@std/assert";
import { mapIssue, mapPR } from "../../src/providers/vcs-mappers.ts";

Deno.test("mapIssue coerces fields and normalizes labels + state", () => {
  const issue = mapIssue({
    number: 7,
    title: "Bug",
    state: "closed",
    labels: ["bug", { name: "urgent" }],
    assignee: { login: "alice" },
    created_at: "2026-01-01T00:00:00Z",
    html_url: "https://host/issues/7",
  });
  assertEquals(issue, {
    number: 7,
    title: "Bug",
    state: "closed",
    labels: ["bug", "urgent"],
    assignee: "alice",
    createdAt: "2026-01-01T00:00:00Z",
    htmlUrl: "https://host/issues/7",
  });
});

Deno.test("mapIssue defaults missing fields (open state, no assignee/labels)", () => {
  const issue = mapIssue({ number: 1, state: "open" });
  assertEquals(issue.state, "open");
  assertEquals(issue.labels, []);
  assertEquals(issue.assignee, null);
  assertEquals(issue.title, "");
  assertEquals(issue.htmlUrl, "");
});

Deno.test("mapPR detects merged via merged_at and filters empty reviewers", () => {
  const pr = mapPR({
    number: 12,
    title: "Feature",
    state: "closed",
    merged_at: "2026-02-02T00:00:00Z",
    user: { login: "bob" },
    head: { ref: "feature/x" },
    requested_reviewers: [{ login: "carol" }, { login: "" }, {}],
    created_at: "2026-02-01T00:00:00Z",
    html_url: "https://host/pull/12",
  });
  assertEquals(pr.merged, true);
  assertEquals(pr.requestedReviewers, ["carol"]);
  assertEquals(pr.author, "bob");
  assertEquals(pr.headBranch, "feature/x");
  assertEquals(pr.reviewDecision, null);
});

Deno.test("mapPR is not merged when merged flag/date absent", () => {
  const pr = mapPR({ number: 3, state: "open", merged_at: null });
  assertEquals(pr.merged, false);
  assertEquals(pr.requestedReviewers, []);
  assertEquals(pr.author, null);
  assertEquals(pr.headBranch, "");
});
