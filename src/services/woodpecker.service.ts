// Woodpecker CI service — wraps WoodpeckerProvider with config-driven host +
// token. No repository/cache: it talks to an external CI engine, not the
// project markdown store. Base URL + token come from ProjectConfig; when the
// base URL is unset the integration is not configured and methods throw
// WOODPECKER_NOT_CONFIGURED (mirrors CerveauService / GitHubService).

import { WoodpeckerProvider } from "../providers/woodpecker.ts";
import type { ProjectService } from "./project.service.ts";
import type {
  WoodpeckerPipeline,
  WoodpeckerRepo,
} from "../types/woodpecker.types.ts";

/** Woodpecker CI client (no repository): repos + pipeline status over REST. */
export class WoodpeckerService {
  constructor(private projectService: ProjectService) {}

  /** Whether a Woodpecker host is configured. */
  async isConfigured(): Promise<boolean> {
    const url = (await this.projectService.getConfig()).woodpeckerBaseUrl;
    return typeof url === "string" && url.length > 0;
  }

  /** Resolve a configured provider or throw a clear error. */
  private async provider(): Promise<WoodpeckerProvider> {
    const config = await this.projectService.getConfig();
    if (!config.woodpeckerBaseUrl) {
      throw new Error(
        "WOODPECKER_NOT_CONFIGURED: set ProjectConfig.woodpeckerBaseUrl to a Woodpecker server URL",
      );
    }
    return new WoodpeckerProvider(
      config.woodpeckerBaseUrl,
      config.woodpeckerToken,
    );
  }

  /** List repos accessible to the configured token, optionally name-filtered. */
  async listRepos(query?: string): Promise<WoodpeckerRepo[]> {
    return (await this.provider()).listRepos(query);
  }

  /** Recent pipelines for an `owner/repo` slug (newest first). */
  async listPipelines(
    githubRepo: string,
    limit?: number,
  ): Promise<WoodpeckerPipeline[]> {
    return (await this.provider()).listPipelines(githubRepo, limit);
  }

  /** A single pipeline by number (or `"latest"`) for an `owner/repo` slug. */
  async getPipeline(
    githubRepo: string,
    number: number | "latest",
  ): Promise<WoodpeckerPipeline> {
    return (await this.provider()).getPipeline(githubRepo, number);
  }

  /** Most recent pipeline for an `owner/repo` slug, or null when there are none. */
  async latestPipeline(
    githubRepo: string,
  ): Promise<WoodpeckerPipeline | null> {
    return (await this.provider()).latestPipeline(githubRepo);
  }
}
