/**
 * MCP tools for GitHub integration.
 * Tools: github_get_repo, github_get_issue, github_create_issue,
 *        github_set_issue_state, github_list_repos, github_get_pr
 *
 * All tools require a GitHub PAT configured via Settings > Integrations.
 * Returns an error content block (not a throw) when no token is configured.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ProjectManager } from "../../lib/project-manager.ts";
import { GitHubApiProvider } from "../../lib/integrations/providers/github.ts";

function ok(data: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
  };
}

function err(message: string) {
  return {
    content: [{ type: "text" as const, text: `Error: ${message}` }],
    isError: true as const,
  };
}

async function resolveProvider(
  pm: ProjectManager,
): Promise<GitHubApiProvider | null> {
  const token = await pm.getIntegrationSecret("github", "token");
  if (!token) return null;
  return new GitHubApiProvider(token);
}

export function registerGitHubTools(
  server: McpServer,
  pm: ProjectManager,
): void {
  server.registerTool(
    "github_get_repo",
    {
      description:
        "Fetch summary stats for a GitHub repository: stars, open issues, open PRs, last push date, license. Requires GitHub token configured in Settings.",
      inputSchema: {
        owner: z.string().describe("Repository owner (GitHub username or org)"),
        repo: z.string().describe("Repository name"),
      },
    },
    async ({ owner, repo }) => {
      const provider = await resolveProvider(pm);
      if (!provider) return err("GitHub token not configured");
      try {
        const data = await provider.getRepo(owner, repo);
        return ok(data);
      } catch (e) {
        return err(e instanceof Error ? e.message : "GitHub API error");
      }
    },
  );

  server.registerTool(
    "github_get_issue",
    {
      description:
        "Fetch the state and details of a single GitHub issue by number.",
      inputSchema: {
        owner: z.string().describe("Repository owner"),
        repo: z.string().describe("Repository name"),
        number: z.number().int().positive().describe("Issue number"),
      },
    },
    async ({ owner, repo, number }) => {
      const provider = await resolveProvider(pm);
      if (!provider) return err("GitHub token not configured");
      try {
        const issue = await provider.getIssue(owner, repo, number);
        return ok(issue);
      } catch (e) {
        return err(e instanceof Error ? e.message : "GitHub API error");
      }
    },
  );

  server.registerTool(
    "github_create_issue",
    {
      description:
        "Create a new GitHub issue in a repository. Returns the created issue number and URL.",
      inputSchema: {
        owner: z.string().describe("Repository owner"),
        repo: z.string().describe("Repository name"),
        title: z.string().min(1).describe("Issue title"),
        body: z.string().optional().describe(
          "Issue body / description (markdown)",
        ),
      },
    },
    async ({ owner, repo, title, body }) => {
      const provider = await resolveProvider(pm);
      if (!provider) return err("GitHub token not configured");
      try {
        const created = await provider.createIssue(
          owner,
          repo,
          title,
          body ?? "",
        );
        return ok(created);
      } catch (e) {
        return err(e instanceof Error ? e.message : "GitHub API error");
      }
    },
  );

  server.registerTool(
    "github_set_issue_state",
    {
      description:
        "Close or reopen a GitHub issue. Use state='closed' to close, state='open' to reopen.",
      inputSchema: {
        owner: z.string().describe("Repository owner"),
        repo: z.string().describe("Repository name"),
        number: z.number().int().positive().describe("Issue number"),
        state: z.enum(["open", "closed"]).describe(
          "Target state: 'open' or 'closed'",
        ),
      },
    },
    async ({ owner, repo, number, state }) => {
      const provider = await resolveProvider(pm);
      if (!provider) return err("GitHub token not configured");
      try {
        const issue = await provider.setIssueState(owner, repo, number, state);
        return ok(issue);
      } catch (e) {
        return err(e instanceof Error ? e.message : "GitHub API error");
      }
    },
  );

  server.registerTool(
    "github_list_repos",
    {
      description:
        "List GitHub repositories accessible to the authenticated user. Supports optional query filter.",
      inputSchema: {
        query: z.string().optional().describe(
          "Optional filter string to narrow results by repo full name",
        ),
      },
    },
    async ({ query }) => {
      const provider = await resolveProvider(pm);
      if (!provider) return err("GitHub token not configured");
      try {
        const repos = await provider.listRepos(query);
        return ok(repos);
      } catch (e) {
        return err(e instanceof Error ? e.message : "GitHub API error");
      }
    },
  );

  server.registerTool(
    "github_get_pr",
    {
      description:
        "Fetch the state and details of a single GitHub pull request by number.",
      inputSchema: {
        owner: z.string().describe("Repository owner"),
        repo: z.string().describe("Repository name"),
        number: z.number().int().positive().describe("Pull request number"),
      },
    },
    async ({ owner, repo, number }) => {
      const provider = await resolveProvider(pm);
      if (!provider) return err("GitHub token not configured");
      try {
        const pr = await provider.getPR(owner, repo, number);
        return ok(pr);
      } catch (e) {
        return err(e instanceof Error ? e.message : "GitHub API error");
      }
    },
  );
}
