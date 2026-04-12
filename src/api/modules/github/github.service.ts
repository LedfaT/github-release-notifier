import githubClient from "./github.client";
import githubCache from "./github.cache";
import { GithubRateLimitError } from "./github.errors";
import { createLogger } from "../../../config/logger";

export interface GithubLatestRelease {
  tagName: string;
  htmlUrl: string;
}

const DEFAULT_RATE_LIMIT_RETRY_SECONDS = 60;
const GITHUB_RATE_LIMIT_MESSAGE = "GitHub API rate limit exceeded";

class GithubService {
  private readonly logger = createLogger("github-service");

  private isRateLimited(response: Response): boolean {
    if (response.status === 429) {
      return true;
    }

    return (
      response.status === 403 &&
      response.headers.get("x-ratelimit-remaining") === "0"
    );
  }

  private getRetryAfterSeconds(resetAt: Date): number | undefined {
    const seconds = Math.ceil((resetAt.getTime() - Date.now()) / 1000);
    return seconds > 0 ? seconds : undefined;
  }

  private parseRetryAfterSeconds(value: string | null): number | undefined {
    if (!value) {
      return undefined;
    }

    const asSeconds = Number.parseInt(value, 10);
    if (Number.isFinite(asSeconds) && asSeconds > 0) {
      return asSeconds;
    }

    const asDate = new Date(value);
    if (Number.isNaN(asDate.getTime())) {
      return undefined;
    }

    return this.getRetryAfterSeconds(asDate);
  }

  private parseRateLimitResetAt(value: string | null): Date | undefined {
    if (!value) {
      return undefined;
    }

    const asUnixSeconds = Number.parseInt(value, 10);
    if (!Number.isFinite(asUnixSeconds)) {
      return undefined;
    }

    const resetAt = new Date(asUnixSeconds * 1000);
    return Number.isNaN(resetAt.getTime()) ? undefined : resetAt;
  }

  private resolveRateLimitBlockedUntil(response: Response): Date {
    const resetAt = this.parseRateLimitResetAt(
      response.headers.get("x-ratelimit-reset"),
    );
    const retryAfterSeconds = this.parseRetryAfterSeconds(
      response.headers.get("retry-after"),
    );

    if (resetAt && resetAt.getTime() > Date.now()) {
      return resetAt;
    }

    if (retryAfterSeconds) {
      return new Date(Date.now() + retryAfterSeconds * 1000);
    }

    return new Date(Date.now() + DEFAULT_RATE_LIMIT_RETRY_SECONDS * 1000);
  }

  private async throwRateLimitError(response: Response): Promise<never> {
    const blockedUntil = this.resolveRateLimitBlockedUntil(response);
    await githubCache.setRateLimitBlockedUntil(blockedUntil);

    const retryAfterSeconds = this.getRetryAfterSeconds(blockedUntil);

    this.logger.warn(
      {
        retryAfterSeconds,
        resetAt: blockedUntil.toISOString(),
      },
      "GitHub rate-limit detected and cached",
    );

    throw new GithubRateLimitError({
      message: GITHUB_RATE_LIMIT_MESSAGE,
      retryAfterSeconds,
      resetAt: blockedUntil,
    });
  }

  async ensureRateLimitNotBlocked(): Promise<void> {
    const blockedUntil = await githubCache.getRateLimitBlockedUntil();

    if (!blockedUntil) {
      return;
    }

    const retryAfterSeconds = this.getRetryAfterSeconds(blockedUntil);

    this.logger.info(
      {
        retryAfterSeconds,
        resetAt: blockedUntil.toISOString(),
      },
      "GitHub requests are blocked by cached rate-limit window",
    );

    throw new GithubRateLimitError({
      message: GITHUB_RATE_LIMIT_MESSAGE,
      retryAfterSeconds,
      resetAt: blockedUntil,
    });
  }

  async repositoryExists(fullName: string): Promise<boolean> {
    const normalizedFullName = fullName.toLowerCase();
    const [owner, repo] = normalizedFullName.split("/");

    if (!owner || !repo) {
      throw new Error("Invalid repository full name. Expected format: 'owner/repo'");
    }

    await this.ensureRateLimitNotBlocked();

    const cachedRepositoryExists =
      await githubCache.getRepositoryExists(normalizedFullName);

    if (cachedRepositoryExists !== null) {
      return cachedRepositoryExists;
    }

    const response = await githubClient.getRepository(owner, repo);

    if (this.isRateLimited(response)) {
      await this.throwRateLimitError(response);
    }

    if (response.status === 404) {
      await githubCache.setRepositoryExists(normalizedFullName, false);
      return false;
    }

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`);
    }

    await githubCache.setRepositoryExists(normalizedFullName, true);

    return true;
  }

  async getLatestRelease(fullName: string): Promise<GithubLatestRelease | null> {
    const normalizedFullName = fullName.toLowerCase();
    const [owner, repo] = normalizedFullName.split("/");

    if (!owner || !repo) {
      throw new Error("Invalid repository full name. Expected format: 'owner/repo'");
    }

    await this.ensureRateLimitNotBlocked();

    const response = await githubClient.getLatestRelease(owner, repo);

    if (this.isRateLimited(response)) {
      await this.throwRateLimitError(response);
    }

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`);
    }

    const body = (await response.json()) as {
      tag_name?: unknown;
      html_url?: unknown;
    };

    if (typeof body.tag_name !== "string" || body.tag_name.length === 0) {
      throw new Error("GitHub API returned release without tag_name");
    }

    return {
      tagName: body.tag_name,
      htmlUrl: typeof body.html_url === "string" ? body.html_url : "",
    };
  }
}

export default new GithubService();
