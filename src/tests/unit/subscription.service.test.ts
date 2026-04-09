import ApiError from "../../api/exceptions/api-error";
import { GithubRateLimitError } from "../../api/modules/github/github.errors";
import subscriptionService from "../../api/modules/subscriptions/subscription.service";
import githubService from "../../api/modules/github/github.service";
import notifierService from "../../api/modules/notifier/notifier.service";
import subscriptionRepository from "../../api/modules/subscriptions/subscription.repository";

jest.mock("../../api/modules/github/github.service", () => ({
  __esModule: true,
  default: {
    repositoryExists: jest.fn(),
  },
}));

jest.mock("../../api/modules/notifier/notifier.service", () => ({
  __esModule: true,
  default: {
    sendConfirmationEmail: jest.fn(),
    sendUnsubscribedEmail: jest.fn(),
    sendNewReleaseEmail: jest.fn(),
  },
}));

jest.mock("../../api/modules/subscriptions/subscription.repository", () => ({
  __esModule: true,
  default: {
    createRepository: jest.fn(),
    findSubscriptionByEmailAndRepositoryId: jest.fn(),
    createSubscription: jest.fn(),
    updateSubscriptionById: jest.fn(),
    findRepositoryById: jest.fn(),
    findSubscriptionByConfirmTokenHash: jest.fn(),
    findSubscriptionByUnsubscribeTokenHash: jest.fn(),
    listSubscriptionsByEmailAndStatus: jest.fn(),
  },
}));

describe("SubscriptionService", () => {
  const githubServiceMock = githubService as jest.Mocked<typeof githubService>;
  const notifierServiceMock = notifierService as jest.Mocked<typeof notifierService>;
  const repositoryMock = subscriptionRepository as jest.Mocked<
    typeof subscriptionRepository
  >;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("creates pending subscription and sends confirmation email", async () => {
    githubServiceMock.repositoryExists.mockResolvedValue(true);
    repositoryMock.createRepository.mockResolvedValue({
      id: "repo-1",
      owner: "owner",
      name: "repo",
      full_name: "owner/repo",
      last_seen_tag: null,
      last_checked_at: null,
      created_at: new Date(),
      updated_at: new Date(),
    } as never);
    repositoryMock.findSubscriptionByEmailAndRepositoryId.mockResolvedValue(
      undefined,
    );
    repositoryMock.createSubscription.mockResolvedValue({
      id: "sub-1",
      email: "user@example.com",
      repository_id: "repo-1",
      status: "pending",
      confirm_token_hash: "confirm-hash",
      unsubscribe_token_hash: "unsubscribe-hash",
      confirmed_at: null,
      unsubscribed_at: null,
      created_at: new Date(),
      updated_at: new Date(),
    } as never);
    notifierServiceMock.sendConfirmationEmail.mockResolvedValue(undefined);

    const result = await subscriptionService.createSubscription({
      email: "user@example.com",
      repository: "Owner/Repo",
    });

    expect(githubServiceMock.repositoryExists).toHaveBeenCalledWith("owner/repo");
    expect(repositoryMock.createRepository).toHaveBeenCalledWith({
      owner: "owner",
      name: "repo",
      full_name: "owner/repo",
    });
    expect(repositoryMock.createSubscription).toHaveBeenCalledTimes(1);
    expect(notifierServiceMock.sendConfirmationEmail).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      id: "sub-1",
      email: "user@example.com",
      repository: "owner/repo",
      status: "pending",
    });
  });

  it("returns 404 when GitHub repository does not exist", async () => {
    githubServiceMock.repositoryExists.mockResolvedValue(false);

    await expect(
      subscriptionService.createSubscription({
        email: "user@example.com",
        repository: "owner/repo",
      }),
    ).rejects.toMatchObject<ApiError>({
      status: 404,
      message: "Repository not found",
    });
  });

  it("maps GitHub rate-limit errors to 429", async () => {
    githubServiceMock.repositoryExists.mockRejectedValue(
      new GithubRateLimitError({
        message: "GitHub API rate limit exceeded",
      }),
    );

    await expect(
      subscriptionService.createSubscription({
        email: "user@example.com",
        repository: "owner/repo",
      }),
    ).rejects.toMatchObject<ApiError>({
      status: 429,
      message: "GitHub API rate limit exceeded. Please try again later.",
    });
  });
});
