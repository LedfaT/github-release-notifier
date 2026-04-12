import { GithubRateLimitError } from "../../api/modules/github/github.errors";
import githubService from "../../api/modules/github/github.service";
import notifierService from "../../api/modules/notifier/notifier.service";
import scannerRepository from "../../api/modules/scanner/scanner.repository";
import scannerService from "../../api/modules/scanner/scanner.service";

jest.mock("../../api/modules/github/github.service", () => ({
  __esModule: true,
  default: {
    ensureRateLimitNotBlocked: jest.fn(),
    getLatestRelease: jest.fn(),
  },
}));

jest.mock("../../api/modules/notifier/notifier.service", () => ({
  __esModule: true,
  default: {
    flushUndeliveredReleaseEmails: jest.fn(),
    sendNewReleaseEmail: jest.fn(),
  },
}));

jest.mock("../../api/modules/scanner/scanner.repository", () => ({
  __esModule: true,
  default: {
    listTrackedRepositories: jest.fn(),
    listActiveSubscribersByRepositoryId: jest.fn(),
    updateRepositoryScanState: jest.fn(),
  },
}));

describe("ScannerService", () => {
  const githubServiceMock = githubService as jest.Mocked<typeof githubService>;
  const notifierServiceMock = notifierService as jest.Mocked<typeof notifierService>;
  const scannerRepositoryMock = scannerRepository as jest.Mocked<
    typeof scannerRepository
  >;

  beforeEach(() => {
    jest.clearAllMocks();
    githubServiceMock.ensureRateLimitNotBlocked.mockResolvedValue(undefined);
    notifierServiceMock.flushUndeliveredReleaseEmails.mockResolvedValue(
      undefined,
    );
  });

  it("sets baseline tag and does not send emails when lastSeenTag is null", async () => {
    scannerRepositoryMock.listTrackedRepositories.mockResolvedValue([
      { id: "repo-1", fullName: "owner/repo", lastSeenTag: null },
    ]);
    githubServiceMock.getLatestRelease.mockResolvedValue({
      tagName: "v1.0.0",
      htmlUrl: "https://github.com/owner/repo/releases/tag/v1.0.0",
    });

    await scannerService.runOnce();

    expect(
      notifierServiceMock.flushUndeliveredReleaseEmails,
    ).toHaveBeenCalledTimes(1);
    expect(
      scannerRepositoryMock.listActiveSubscribersByRepositoryId,
    ).not.toHaveBeenCalled();
    expect(notifierServiceMock.sendNewReleaseEmail).not.toHaveBeenCalled();
    expect(scannerRepositoryMock.updateRepositoryScanState).toHaveBeenCalledWith(
      "repo-1",
      expect.objectContaining({
        lastSeenTag: "v1.0.0",
      }),
    );
  });

  it("sends notifications for a new release and updates lastSeenTag", async () => {
    scannerRepositoryMock.listTrackedRepositories.mockResolvedValue([
      { id: "repo-1", fullName: "owner/repo", lastSeenTag: "v1.0.0" },
    ]);
    githubServiceMock.getLatestRelease.mockResolvedValue({
      tagName: "v1.1.0",
      htmlUrl: "https://github.com/owner/repo/releases/tag/v1.1.0",
    });
    scannerRepositoryMock.listActiveSubscribersByRepositoryId.mockResolvedValue([
      { email: "a@example.com" },
      { email: "b@example.com" },
    ]);
    notifierServiceMock.sendNewReleaseEmail.mockResolvedValue(undefined);

    await scannerService.runOnce();

    expect(
      notifierServiceMock.flushUndeliveredReleaseEmails,
    ).toHaveBeenCalledTimes(1);
    expect(notifierServiceMock.sendNewReleaseEmail).toHaveBeenCalledTimes(2);
    expect(notifierServiceMock.sendNewReleaseEmail).toHaveBeenNthCalledWith(1, {
      email: "a@example.com",
      repository: "owner/repo",
      tagName: "v1.1.0",
      releaseUrl: "https://github.com/owner/repo/releases/tag/v1.1.0",
    });
    expect(scannerRepositoryMock.updateRepositoryScanState).toHaveBeenLastCalledWith(
      "repo-1",
      expect.objectContaining({
        lastSeenTag: "v1.1.0",
      }),
    );
  });

  it("stops current cycle when GitHub rate-limit is reached", async () => {
    scannerRepositoryMock.listTrackedRepositories.mockResolvedValue([
      { id: "repo-1", fullName: "owner/repo-1", lastSeenTag: "v1.0.0" },
      { id: "repo-2", fullName: "owner/repo-2", lastSeenTag: "v1.0.0" },
    ]);
    githubServiceMock.getLatestRelease.mockRejectedValueOnce(
      new GithubRateLimitError({
        message: "GitHub API rate limit exceeded",
      }),
    );

    await scannerService.runOnce();

    expect(
      notifierServiceMock.flushUndeliveredReleaseEmails,
    ).toHaveBeenCalledTimes(1);
    expect(githubServiceMock.ensureRateLimitNotBlocked).toHaveBeenCalledTimes(1);
    expect(githubServiceMock.getLatestRelease).toHaveBeenCalledTimes(1);
    expect(githubServiceMock.getLatestRelease).toHaveBeenCalledWith(
      "owner/repo-1",
    );
    expect(notifierServiceMock.sendNewReleaseEmail).not.toHaveBeenCalled();
  });

  it("skips cycle when cached GitHub rate-limit is active", async () => {
    githubServiceMock.ensureRateLimitNotBlocked.mockRejectedValue(
      new GithubRateLimitError({
        message: "GitHub API rate limit exceeded",
        retryAfterSeconds: 90,
      }),
    );

    await scannerService.runOnce();

    expect(
      notifierServiceMock.flushUndeliveredReleaseEmails,
    ).toHaveBeenCalledTimes(1);
    expect(githubServiceMock.ensureRateLimitNotBlocked).toHaveBeenCalledTimes(1);
    expect(scannerRepositoryMock.listTrackedRepositories).not.toHaveBeenCalled();
    expect(githubServiceMock.getLatestRelease).not.toHaveBeenCalled();
    expect(notifierServiceMock.sendNewReleaseEmail).not.toHaveBeenCalled();
  });

  it("processes undelivered release queue before GitHub scanning", async () => {
    scannerRepositoryMock.listTrackedRepositories.mockResolvedValue([]);

    await scannerService.runOnce();

    const flushOrder =
      notifierServiceMock.flushUndeliveredReleaseEmails.mock
        .invocationCallOrder[0];
    const listRepositoriesOrder =
      scannerRepositoryMock.listTrackedRepositories.mock.invocationCallOrder[0];

    expect(flushOrder).toBeLessThan(listRepositoriesOrder);
  });
});
