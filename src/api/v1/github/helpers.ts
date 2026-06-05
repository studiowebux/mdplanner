// GitHub route helpers — error mapping and portfolio repo resolution.

import type { Context, ErrorHandler } from "hono";
import { getPortfolioService } from "../../../singletons/services.ts";
import {
  type AppError,
  badGateway,
  badRequest,
  notFound,
  unauthorized,
} from "../../../types/api.ts";

/**
 * HTTP error raised inside a GitHub route. Carries a ready-to-serialize
 * AppError body plus its status code; mapped to a JSON response by
 * `githubOnError` (registered as the router's error handler). The status is
 * constrained to the codes resolveRepo can raise so `c.json` needs no cast.
 */
export class GitHubHttpError extends Error {
  constructor(
    readonly body: AppError,
    readonly statusCode: 400 | 404,
  ) {
    super(body.message);
    this.name = "GitHubHttpError";
  }
}

/**
 * Router-level error handler for githubRouter. Maps both explicit
 * GitHubHttpError (config/resolution failures from resolveRepo) and raw
 * GitHub service errors (token / HTTP-status message strings) to AppError
 * JSON responses. Registered once via `githubRouter.onError`, so handlers
 * just throw instead of wrapping every call in try/catch.
 */
export const githubOnError: ErrorHandler = (err, c) => {
  if (err instanceof GitHubHttpError) {
    return c.json(err.body, err.statusCode);
  }
  const msg = err instanceof Error ? err.message : String(err);
  if (
    msg.startsWith("GITHUB_TOKEN_NOT_CONFIGURED") ||
    msg.startsWith("GITHUB_REPO_NOT_CONFIGURED") ||
    msg.startsWith("GITHUB_REPO_INVALID")
  ) {
    return c.json(badRequest(msg, { error: msg.split(":")[0] }), 400);
  }
  if (msg.includes("401")) {
    return c.json(
      unauthorized("GitHub token is invalid or expired", {
        error: "GITHUB_UNAUTHORIZED",
      }),
      401,
    );
  }
  if (msg.includes("404")) {
    return c.json(
      notFound("GITHUB", msg, { error: "GITHUB_NOT_FOUND", message: msg }),
      404,
    );
  }
  return c.json(badGateway(msg, { error: "GITHUB_ERROR" }), 502);
};

/**
 * Resolve the portfolio item's githubRepo from the parent :id param.
 * Throws GitHubHttpError (caught by githubOnError) when the portfolio is
 * missing or has no githubRepo configured, so callers receive the repo
 * string directly.
 */
export async function resolveRepo(c: Context): Promise<string> {
  const portfolioId = c.req.param("id");
  const item = portfolioId
    ? await getPortfolioService().getById(portfolioId)
    : null;
  if (!item) {
    throw new GitHubHttpError(notFound("PORTFOLIO", portfolioId ?? ""), 404);
  }
  if (!item.githubRepo) {
    throw new GitHubHttpError(
      badRequest(
        `Portfolio item "${item.name}" has no githubRepo configured`,
        { error: "GITHUB_REPO_NOT_CONFIGURED" },
      ),
      400,
    );
  }
  return item.githubRepo;
}
