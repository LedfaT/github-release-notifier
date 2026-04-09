import { env } from "../../../config/env";

class GithubClient {
  private readonly githubUrl;

  constructor() {
    this.githubUrl = env.GITHUB_API_BASE_URL;
  }

  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      Accept: "application/vnd.github+json",
      "User-Agent": "github-release-notifier",
    };

    if (env.GITHUB_TOKEN) {
      headers.Authorization = `Bearer ${env.GITHUB_TOKEN}`;
    }

    return headers;
  }

  async getRepository(owner: string, repo: string): Promise<Response> {
    return await fetch(`${this.githubUrl}/repos/${owner}/${repo}`, {
      headers: this.buildHeaders(),
    });
  }

  async getLatestRelease(owner: string, repo: string): Promise<Response> {
    return await fetch(`${this.githubUrl}/repos/${owner}/${repo}/releases/latest`, {
      headers: this.buildHeaders(),
    });
  }
}

export default new GithubClient();
