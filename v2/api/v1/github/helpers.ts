// GitHub route helpers — error mapping and portfolio repo resolution.

import { getPortfolioService } from "../../../singletons/services.ts";

/**
 * Map GitHub service errors to HTTP responses via c.json().
 */
// deno-lint-ignore no-explicit-any
export function githubError(c: { json: (d: any, s: number) => any }, err: unknown) {
  const msg = err instanceof Error ? err.message : String(err);
  if (
    msg.startsWith("GITHUB_TOKEN_NOT_CONFIGURED") ||
    msg.startsWith("GITHUB_REPO_NOT_CONFIGURED") ||
    msg.startsWith("GITHUB_REPO_INVALID")
  ) {
    return c.json({ error: msg.split(":")[0], message: msg }, 400);
  }
  if (msg.includes("401")) {
    return c.json(
      {
        error: "GITHUB_UNAUTHORIZED",
        message: "GitHub token is invalid or expired",
      },
      401,
    );
  }
  if (msg.includes("404")) {
    return c.json({ error: "GITHUB_NOT_FOUND", message: msg }, 404);
  }
  return c.json({ error: "GITHUB_ERROR", message: msg }, 502);
}

/**
 * Resolve the portfolio item's githubRepo from the parent :id param.
 * Returns the repo string or an error response.
 */
export async function resolveRepo(
  // deno-lint-ignore no-explicit-any
  c: { req: { param: (k: string) => string }; json: (d: any, s: number) => any },
): Promise<string | Response> {
  const portfolioId = c.req.param("id");
  const item = await getPortfolioService().getById(portfolioId);
  if (!item) {
    return c.json(
      {
        error: "PORTFOLIO_NOT_FOUND",
        message: `Portfolio item ${portfolioId} not found`,
      },
      404,
    );
  }
  if (!item.githubRepo) {
    return c.json(
      {
        error: "GITHUB_REPO_NOT_CONFIGURED",
        message: `Portfolio item "${item.name}" has no githubRepo configured`,
      },
      400,
    );
  }
  return item.githubRepo;
}
