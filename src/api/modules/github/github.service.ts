import githubClient from "./github.client";
import githubCache from "./github.cache";
import { GithubRateLimitError } from "./github.errors";

export interface GithubLatestRelease {
  tagName: string;
  htmlUrl: string;
}

class GithubService {
  private isRateLimited(response: Response): boolean {
    if (response.status === 429) {
      return true;
    }

    return (
      response.status === 403 &&
      response.headers.get("x-ratelimit-remaining") === "0"
    );
  }

  private throwRateLimitError(response: Response): never {
    const retryAfterHeader = response.headers.get("retry-after");
    const retryAfterSeconds = retryAfterHeader
      ? Number.parseInt(retryAfterHeader, 10)
      : undefined;

    const resetHeader = response.headers.get("x-ratelimit-reset");
    const resetAt = resetHeader
      ? new Date(Number.parseInt(resetHeader, 10) * 1000)
      : undefined;

    throw new GithubRateLimitError({
      message: "GitHub API rate limit exceeded",
      retryAfterSeconds: Number.isFinite(retryAfterSeconds)
        ? retryAfterSeconds
        : undefined,
      resetAt: resetAt && !Number.isNaN(resetAt.getTime()) ? resetAt : undefined,
    });
  }

  async repositoryExists(fullName: string): Promise<boolean> {
    const normalizedFullName = fullName.toLowerCase();
    const [owner, repo] = normalizedFullName.split("/");

    if (!owner || !repo) {
      throw new Error("Invalid repository full name. Expected format: 'owner/repo'");
    }

    const cachedRepositoryExists =
      await githubCache.getRepositoryExists(normalizedFullName);

    if (cachedRepositoryExists !== null) {
      return cachedRepositoryExists;
    }

    const response = await githubClient.getRepository(owner, repo);

    if (this.isRateLimited(response)) {
      this.throwRateLimitError(response);
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

    const response = await githubClient.getLatestRelease(owner, repo);

    if (this.isRateLimited(response)) {
      this.throwRateLimitError(response);
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
