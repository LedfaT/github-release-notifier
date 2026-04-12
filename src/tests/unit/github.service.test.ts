import { GithubRateLimitError } from "../../api/modules/github/github.errors";
import githubService from "../../api/modules/github/github.service";
import githubClient from "../../api/modules/github/github.client";
import githubCache from "../../api/modules/github/github.cache";

jest.mock("../../api/modules/github/github.client", () => ({
  __esModule: true,
  default: {
    getRepository: jest.fn(),
    getLatestRelease: jest.fn(),
  },
}));

jest.mock("../../api/modules/github/github.cache", () => ({
  __esModule: true,
  default: {
    getRepositoryExists: jest.fn(),
    setRepositoryExists: jest.fn(),
    getRateLimitBlockedUntil: jest.fn(),
    setRateLimitBlockedUntil: jest.fn(),
  },
}));

describe("GithubService", () => {
  const githubClientMock = githubClient as jest.Mocked<typeof githubClient>;
  const githubCacheMock = githubCache as jest.Mocked<typeof githubCache>;

  beforeEach(() => {
    jest.clearAllMocks();
    githubCacheMock.getRateLimitBlockedUntil.mockResolvedValue(null);
    githubCacheMock.getRepositoryExists.mockResolvedValue(null);
    githubCacheMock.setRepositoryExists.mockResolvedValue(undefined);
    githubCacheMock.setRateLimitBlockedUntil.mockResolvedValue(undefined);
  });

  it("blocks GitHub calls when cached rate-limit window is active", async () => {
    githubCacheMock.getRateLimitBlockedUntil.mockResolvedValue(
      new Date(Date.now() + 120_000),
    );

    await expect(githubService.repositoryExists("owner/repo")).rejects.toThrow(
      GithubRateLimitError,
    );

    expect(githubClientMock.getRepository).not.toHaveBeenCalled();
  });

  it("stores rate-limit window in cache when GitHub responds with 429", async () => {
    githubClientMock.getRepository.mockResolvedValue(
      new Response("", {
        status: 429,
        headers: {
          "retry-after": "30",
        },
      }),
    );

    await expect(githubService.repositoryExists("owner/repo")).rejects.toThrow(
      GithubRateLimitError,
    );

    expect(githubCacheMock.setRateLimitBlockedUntil).toHaveBeenCalledTimes(1);
    expect(githubCacheMock.setRateLimitBlockedUntil).toHaveBeenCalledWith(
      expect.any(Date),
    );
  });
});
