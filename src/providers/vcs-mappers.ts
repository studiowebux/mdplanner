// Shared VCS JSON → domain mappers.
//
// Gitea and GitHub expose the same REST field shapes for issues and pull
// requests (both normalize to `GhJson`), so their mapIssue/mapPR bodies were
// byte-identical copies. One source of truth lives here; each provider imports
// it. Provider-specific mappers (e.g. GitHub Actions workflow runs) stay in
// their own file.

import type { GhJson, GitHubIssue, GitHubPR } from "../types/github.types.ts";

export function mapIssue(d: GhJson): GitHubIssue {
  const assignee = d.assignee as GhJson | null;
  return {
    number: Number(d.number),
    title: String(d.title ?? ""),
    state: d.state === "closed" ? "closed" : "open",
    labels: Array.isArray(d.labels)
      ? (d.labels as GhJson[]).map((l) =>
        typeof l === "string" ? l : String((l as GhJson).name ?? "")
      )
      : [],
    assignee: assignee ? String(assignee.login ?? "") : null,
    createdAt: String(d.created_at ?? ""),
    htmlUrl: String(d.html_url ?? ""),
  };
}

export function mapPR(d: GhJson): GitHubPR {
  const assignee = d.assignee as GhJson | null;
  const author = d.user as GhJson | null;
  const head = d.head as GhJson | null;
  const reviewers = Array.isArray(d.requested_reviewers)
    ? (d.requested_reviewers as GhJson[]).map((r) => String(r.login ?? ""))
      .filter((l) => l.length > 0)
    : [];
  return {
    number: Number(d.number),
    title: String(d.title ?? ""),
    state: d.state === "closed" ? "closed" : "open",
    merged: d.merged === true || d.merged_at !== null,
    author: author ? String(author.login ?? "") : null,
    assignee: assignee ? String(assignee.login ?? "") : null,
    requestedReviewers: reviewers,
    headBranch: head ? String(head.ref ?? "") : "",
    createdAt: String(d.created_at ?? ""),
    reviewDecision: null,
    htmlUrl: String(d.html_url ?? ""),
  };
}
