// MCP tools for GitHub operations — thin wrappers over GitHubService.

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { defineMcpModule } from "../module.ts";
import { getGitHubService } from "../../singletons/services.ts";
import {
  CreateIssueBodySchema,
  GitHubNumberInput,
  GitHubRepoInput,
  ListIssuesQuerySchema,
  ListPRsQuerySchema,
  MergePRBodySchema,
  PatchIssueBodySchema,
  VcsProviderInput,
} from "../../types/github.types.ts";
import { err, ok } from "../utils.ts";

export function registerGitHubTools(server: McpServer): void {
  const service = getGitHubService();

  server.registerTool(
    "github_get_repo",
    {
      description:
        "Fetch repository summary: stars, open issues, open PRs, license, last push.",
      inputSchema: { githubRepo: GitHubRepoInput, provider: VcsProviderInput },
    },
    async ({ githubRepo, provider }) => {
      try {
        return ok(await service.getRepo(githubRepo, provider));
      } catch (e) {
        return err(e instanceof Error ? e.message : String(e));
      }
    },
  );

  server.registerTool(
    "github_list_repos",
    {
      description:
        "List GitHub repositories accessible to the authenticated user, optionally filtered by query.",
      inputSchema: {
        query: ListIssuesQuerySchema.shape.assignee.describe(
          "Filter repos by name substring",
        ),
        provider: VcsProviderInput,
      },
    },
    async ({ query, provider }) => {
      try {
        return ok(await service.listRepos(query, provider));
      } catch (e) {
        return err(e instanceof Error ? e.message : String(e));
      }
    },
  );

  server.registerTool(
    "github_get_issue",
    {
      description: "Fetch a single GitHub issue by number.",
      inputSchema: {
        githubRepo: GitHubRepoInput,
        number: GitHubNumberInput,
        provider: VcsProviderInput,
      },
    },
    async ({ githubRepo, number, provider }) => {
      try {
        return ok(await service.getIssue(githubRepo, number, provider));
      } catch (e) {
        return err(e instanceof Error ? e.message : String(e));
      }
    },
  );

  server.registerTool(
    "github_create_issue",
    {
      description: "Create a new GitHub issue.",
      inputSchema: {
        githubRepo: GitHubRepoInput,
        title: CreateIssueBodySchema.shape.title,
        body: CreateIssueBodySchema.shape.body,
        provider: VcsProviderInput,
      },
    },
    async ({ githubRepo, title, body, provider }) => {
      try {
        return ok(await service.createIssue(githubRepo, title, body, provider));
      } catch (e) {
        return err(e instanceof Error ? e.message : String(e));
      }
    },
  );

  server.registerTool(
    "github_set_issue_state",
    {
      description: "Open or close a GitHub issue.",
      inputSchema: {
        githubRepo: GitHubRepoInput,
        number: GitHubNumberInput,
        state: PatchIssueBodySchema.shape.state,
        provider: VcsProviderInput,
      },
    },
    async ({ githubRepo, number, state, provider }) => {
      try {
        return ok(
          await service.setIssueState(githubRepo, number, state, provider),
        );
      } catch (e) {
        return err(e instanceof Error ? e.message : String(e));
      }
    },
  );

  server.registerTool(
    "github_list_issues",
    {
      description:
        "List GitHub issues for a repository, optionally filtered by state and assignee.",
      inputSchema: {
        githubRepo: GitHubRepoInput,
        state: ListIssuesQuerySchema.shape.state,
        assignee: ListIssuesQuerySchema.shape.assignee,
        provider: VcsProviderInput,
      },
    },
    async ({ githubRepo, state, assignee, provider }) => {
      try {
        return ok(
          await service.listIssues(githubRepo, state, assignee, provider),
        );
      } catch (e) {
        return err(e instanceof Error ? e.message : String(e));
      }
    },
  );

  server.registerTool(
    "github_list_prs",
    {
      description:
        "List GitHub pull requests for a repository, optionally filtered by state.",
      inputSchema: {
        githubRepo: GitHubRepoInput,
        state: ListPRsQuerySchema.shape.state,
        provider: VcsProviderInput,
      },
    },
    async ({ githubRepo, state, provider }) => {
      try {
        return ok(await service.listPRs(githubRepo, state, provider));
      } catch (e) {
        return err(e instanceof Error ? e.message : String(e));
      }
    },
  );

  server.registerTool(
    "github_get_pr",
    {
      description: "Fetch a single GitHub pull request by number.",
      inputSchema: {
        githubRepo: GitHubRepoInput,
        number: GitHubNumberInput,
        provider: VcsProviderInput,
      },
    },
    async ({ githubRepo, number, provider }) => {
      try {
        return ok(await service.getPR(githubRepo, number, provider));
      } catch (e) {
        return err(e instanceof Error ? e.message : String(e));
      }
    },
  );

  server.registerTool(
    "github_merge_pr",
    {
      description: "Merge a GitHub pull request.",
      inputSchema: {
        githubRepo: GitHubRepoInput,
        number: GitHubNumberInput,
        mergeMethod: MergePRBodySchema.shape.mergeMethod,
        provider: VcsProviderInput,
      },
    },
    async ({ githubRepo, number, mergeMethod, provider }) => {
      try {
        return ok(
          await service.mergePR(githubRepo, number, mergeMethod, provider),
        );
      } catch (e) {
        return err(e instanceof Error ? e.message : String(e));
      }
    },
  );
}

export const gitHubModule = defineMcpModule({
  feature: "github",
  register: registerGitHubTools,
});
