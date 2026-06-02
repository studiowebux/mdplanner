// MCP tools for GitHub operations — thin wrappers over GitHubService.

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getGitHubService } from "../../singletons/services.ts";
import {
  CreateIssueBodySchema,
  GitHubNumberInput,
  GitHubRepoInput,
  ListIssuesQuerySchema,
  ListPRsQuerySchema,
  MergePRBodySchema,
  PatchIssueBodySchema,
} from "../../types/github.types.ts";
import { err, ok } from "../utils.ts";

export function registerGitHubTools(server: McpServer): void {
  const service = getGitHubService();

  server.registerTool(
    "github_get_repo",
    {
      description:
        "Fetch GitHub repository summary: stars, open issues, open PRs, license, last push.",
      inputSchema: { githubRepo: GitHubRepoInput },
    },
    async ({ githubRepo }) => {
      try {
        return ok(await service.getRepo(githubRepo));
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
      },
    },
    async ({ query }) => {
      try {
        return ok(await service.listRepos(query));
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
      },
    },
    async ({ githubRepo, number }) => {
      try {
        return ok(await service.getIssue(githubRepo, number));
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
      },
    },
    async ({ githubRepo, title, body }) => {
      try {
        return ok(await service.createIssue(githubRepo, title, body));
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
      },
    },
    async ({ githubRepo, number, state }) => {
      try {
        return ok(await service.setIssueState(githubRepo, number, state));
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
      },
    },
    async ({ githubRepo, state, assignee }) => {
      try {
        return ok(await service.listIssues(githubRepo, state, assignee));
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
      },
    },
    async ({ githubRepo, state }) => {
      try {
        return ok(await service.listPRs(githubRepo, state));
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
      },
    },
    async ({ githubRepo, number }) => {
      try {
        return ok(await service.getPR(githubRepo, number));
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
      },
    },
    async ({ githubRepo, number, mergeMethod }) => {
      try {
        return ok(await service.mergePR(githubRepo, number, mergeMethod));
      } catch (e) {
        return err(e instanceof Error ? e.message : String(e));
      }
    },
  );
}
