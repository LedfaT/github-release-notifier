import ApiError from "../../exceptions/api-error";
import { CreateSubscriptionDto } from "../../validators/subscription.validator";
import githubService from "../github/github.service";
import { GithubRateLimitError } from "../github/github.errors";
import notifierService from "../notifier/notifier.service";
import subscriptionRepository from "./subscription.repository";
import {
  ActiveSubscriptionResult,
  CreateSubscriptionResult,
} from "./subscription.types";
import crypto from "node:crypto";
import { createLogger } from "../../../config/logger";

const logger = createLogger("subscription-service");

export class SubscriptionService {
  async createSubscription(
    data: CreateSubscriptionDto,
  ): Promise<CreateSubscriptionResult> {
    const normalizedRepository = data.repository.trim().toLowerCase();
    const [owner, repo] = normalizedRepository.split("/");

    logger.info(
      { email: data.email, repository: normalizedRepository },
      "Processing subscription request",
    );

    if (!owner || !repo) {
      logger.warn(
        { repository: normalizedRepository },
        "Invalid repository format in subscription request",
      );
      throw ApiError.BadRequest("Repository must be in format owner/repo");
    }

    let repositoryExists: boolean;

    try {
      repositoryExists = await githubService.repositoryExists(normalizedRepository);
    } catch (err) {
      if (err instanceof GithubRateLimitError) {
        throw new ApiError(429, this.buildRateLimitMessage(err), [
          {
            code: "GITHUB_RATE_LIMIT",
            retryAfterSeconds: err.retryAfterSeconds,
            resetAt: err.resetAt?.toISOString(),
          },
        ]);
      }

      throw err;
    }

    if (!repositoryExists) {
      logger.warn(
        { email: data.email, repository: normalizedRepository },
        "Repository not found in GitHub",
      );
      throw ApiError.notFound("Repository not found");
    }

    const repository = await subscriptionRepository.createRepository({
      owner,
      name: repo,
      full_name: normalizedRepository,
    });

    const existingSubscription =
      await subscriptionRepository.findSubscriptionByEmailAndRepositoryId(
        data.email,
        repository.id,
      );

    if (existingSubscription?.status === "active") {
      logger.warn(
        { email: data.email, repository: normalizedRepository },
        "Active subscription already exists",
      );
      throw ApiError.BadRequest(
        "Subscription already exists for this email and repository",
      );
    }

    const confirmToken = crypto.randomUUID();
    const unsubscribeToken = crypto.randomUUID();
    const confirmTokenHash = this.hashToken(confirmToken);
    const unsubscribeTokenHash = this.hashToken(unsubscribeToken);

    let subscription = existingSubscription
      ? await subscriptionRepository.updateSubscriptionById(
          existingSubscription.id,
          {
            status: "pending",
            confirm_token_hash: confirmTokenHash,
            unsubscribe_token_hash: unsubscribeTokenHash,
            confirmed_at: null,
            unsubscribed_at: null,
          },
        )
      : await subscriptionRepository.createSubscription({
          email: data.email,
          repository_id: repository.id,
          status: "pending",
          confirm_token_hash: confirmTokenHash,
          unsubscribe_token_hash: unsubscribeTokenHash,
        });

    try {
      await notifierService.sendConfirmationEmail({
        email: data.email,
        repository: repository.full_name,
        confirmToken,
        unsubscribeToken,
      });
    } catch (err) {
      logger.warn(
        {
          err,
          subscriptionId: subscription.id,
          email: subscription.email,
          repository: repository.full_name,
        },
        "Failed to send confirmation email; subscription remains pending",
      );
    }

    logger.info(
      {
        subscriptionId: subscription.id,
        email: subscription.email,
        repository: repository.full_name,
        status: subscription.status,
      },
      "Subscription stored and confirmation email sent",
    );

    return {
      id: subscription.id,
      email: subscription.email,
      repository: repository.full_name,
      status: subscription.status,
    };
  }

  async confirmSubscription(token: string): Promise<void> {
    const tokenHash = this.hashToken(token);

    logger.info("Processing subscription confirmation");

    const subscription =
      await subscriptionRepository.findSubscriptionByConfirmTokenHash(
        tokenHash,
      );

    if (!subscription) {
      logger.warn("Confirmation failed due to invalid or expired token");
      throw ApiError.notFound("Invalid or expired confirmation token");
    }

    if (subscription.status !== "pending") {
      logger.warn(
        { subscriptionId: subscription.id, status: subscription.status },
        "Confirmation rejected because subscription is not pending",
      );
      throw ApiError.BadRequest("Subscription is not awaiting confirmation");
    }

    await subscriptionRepository.updateSubscriptionById(subscription.id, {
      status: "active",
      confirm_token_hash: null,
      confirmed_at: new Date(),
      unsubscribed_at: null,
    });

    logger.info(
      { subscriptionId: subscription.id, email: subscription.email },
      "Subscription confirmed",
    );
  }

  async unsubscribe(token: string): Promise<void> {
    const tokenHash = this.hashToken(token);

    logger.info("Processing unsubscription request");

    const subscription =
      await subscriptionRepository.findSubscriptionByUnsubscribeTokenHash(
        tokenHash,
      );

    if (!subscription) {
      logger.warn("Unsubscribe failed due to invalid token");
      throw ApiError.notFound("Invalid unsubscribe token");
    }

    if (subscription.status === "unsubscribed") {
      logger.info(
        { subscriptionId: subscription.id, email: subscription.email },
        "Unsubscribe request ignored because already unsubscribed",
      );
      return;
    }

    await subscriptionRepository.updateSubscriptionById(subscription.id, {
      status: "unsubscribed",
      confirm_token_hash: null,
      unsubscribed_at: new Date(),
    });

    const repository = await subscriptionRepository.findRepositoryById(
      subscription.repository_id,
    );

    try {
      await notifierService.sendUnsubscribedEmail({
        email: subscription.email,
        repository: repository?.full_name ?? "unknown repository",
      });
    } catch (err) {
      logger.warn(
        {
          err,
          subscriptionId: subscription.id,
          email: subscription.email,
        },
        "Failed to send unsubscribe email; subscription status is updated",
      );
    }

    logger.info(
      { subscriptionId: subscription.id, email: subscription.email },
      "Subscription unsubscribed",
    );
  }

  async getActiveSubscriptions(
    email: string,
  ): Promise<ActiveSubscriptionResult[]> {
    const subscriptions =
      await subscriptionRepository.listSubscriptionsByEmailAndStatus(
        email,
        "active",
      );

    logger.info(
      { email, count: subscriptions.length },
      "Active subscriptions fetched",
    );

    return subscriptions;
  }

  private hashToken(token: string): string {
    return crypto.createHash("sha256").update(token).digest("hex");
  }

  private buildRateLimitMessage(error: GithubRateLimitError): string {
    const details: string[] = [];

    if (typeof error.retryAfterSeconds === "number") {
      details.push(`Try again in ${error.retryAfterSeconds} seconds.`);
    }

    if (error.resetAt) {
      details.push(`GitHub requests will resume at ${error.resetAt.toISOString()}.`);
    }

    if (details.length === 0) {
      details.push("Please try again later.");
    }

    return `GitHub API rate limit exceeded. ${details.join(" ")}`;
  }
}

export default new SubscriptionService();
