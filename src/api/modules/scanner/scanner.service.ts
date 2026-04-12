import { createLogger } from "../../../config/logger";
import { GithubRateLimitError } from "../github/github.errors";
import githubService from "../github/github.service";
import notifierService from "../notifier/notifier.service";
import scannerRepository from "./scanner.repository";
import { TrackedRepository } from "./scanner.types";

const logger = createLogger("scanner-service");

class ScannerService {
  async runOnce(): Promise<void> {
    try {
      await notifierService.flushUndeliveredReleaseEmails();
    } catch (err) {
      logger.error({ err }, "Failed to process undelivered release emails");
    }

    try {
      await githubService.ensureRateLimitNotBlocked();
    } catch (err) {
      if (err instanceof GithubRateLimitError) {
        logger.warn(
          {
            retryAfterSeconds: err.retryAfterSeconds,
            resetAt: err.resetAt?.toISOString(),
          },
          "Scanner cycle skipped due to active GitHub rate limit",
        );
        return;
      }

      throw err;
    }

    const repositories = await scannerRepository.listTrackedRepositories();
    logger.info({ repositories: repositories.length }, "Scanner cycle started");

    for (const repository of repositories) {
      logger.info(repository);
      try {
        await this.processRepository(repository);
      } catch (err) {
        if (err instanceof GithubRateLimitError) {
          logger.warn(
            {
              repository: repository.fullName,
              retryAfterSeconds: err.retryAfterSeconds,
              resetAt: err.resetAt?.toISOString(),
            },
            "Scanner stopped due to GitHub rate limit",
          );
          return;
        }

        logger.error(
          { err, repository: repository.fullName },
          "Failed to scan repository",
        );
      }
    }

    logger.info("Scanner cycle finished");
  }

  private async processRepository(
    repository: TrackedRepository,
  ): Promise<void> {
    const latestRelease = await githubService.getLatestRelease(
      repository.fullName,
    );
    const now = new Date();

    if (!latestRelease) {
      await scannerRepository.updateRepositoryScanState(repository.id, {
        lastCheckedAt: now,
      });

      return;
    }

    if (!repository.lastSeenTag) {
      await scannerRepository.updateRepositoryScanState(repository.id, {
        lastSeenTag: latestRelease.tagName,
        lastCheckedAt: now,
      });

      return;
    }

    if (repository.lastSeenTag === latestRelease.tagName) {
      await scannerRepository.updateRepositoryScanState(repository.id, {
        lastCheckedAt: now,
      });

      return;
    }

    const subscribers =
      await scannerRepository.listActiveSubscribersByRepositoryId(
        repository.id,
      );

    for (const subscriber of subscribers) {
      try {
        await notifierService.sendNewReleaseEmail({
          email: subscriber.email,
          repository: repository.fullName,
          tagName: latestRelease.tagName,
          releaseUrl: latestRelease.htmlUrl,
        });
      } catch (err) {
        logger.warn(
          {
            err,
            repository: repository.fullName,
            email: subscriber.email,
            tagName: latestRelease.tagName,
          },
          "Failed to send release notification",
        );
      }
    }

    await scannerRepository.updateRepositoryScanState(repository.id, {
      lastSeenTag: latestRelease.tagName,
      lastCheckedAt: now,
    });

    logger.info(
      {
        repository: repository.fullName,
        tagName: latestRelease.tagName,
        notified: subscribers.length,
      },
      "New release processed",
    );
  }
}

export default new ScannerService();
