import { redis } from "../../../config/redis";
import { createLogger } from "../../../config/logger";
import { env } from "../../../config/env";

const logger = createLogger("github-cache");
const RATE_LIMIT_BLOCKED_UNTIL_KEY = "github:rate_limit:blocked_until";

class GithubCache {
  private getRepositoryExistsCacheKey(fullName: string): string {
    return `github:repo_exists:${fullName.toLowerCase()}`;
  }

  async getRepositoryExists(fullName: string): Promise<boolean | null> {
    if (!redis.isOpen) {
      return null;
    }

    const key = this.getRepositoryExistsCacheKey(fullName);

    try {
      const value = await redis.get(key);

      if (value === null) {
        return null;
      }

      return value === "1";
    } catch (err) {
      logger.warn({ err, key }, "Failed to read GitHub cache");
      return null;
    }
  }

  async setRepositoryExists(fullName: string, exists: boolean): Promise<void> {
    if (!redis.isOpen) {
      return;
    }

    const key = this.getRepositoryExistsCacheKey(fullName);
    const value = exists ? "1" : "0";

    try {
      await redis.set(key, value, {
        expiration: { type: "EX", value: env.REDIS_TTL },
      });
    } catch (err) {
      logger.warn({ err, key }, "Failed to write GitHub cache");
    }
  }

  async getRateLimitBlockedUntil(): Promise<Date | null> {
    if (!redis.isOpen) {
      return null;
    }

    try {
      const value = await redis.get(RATE_LIMIT_BLOCKED_UNTIL_KEY);

      if (!value) {
        return null;
      }

      const blockedUntilMs = Number.parseInt(value, 10);

      if (!Number.isFinite(blockedUntilMs)) {
        logger.warn(
          { value },
          "Invalid GitHub rate-limit cache payload, ignoring",
        );
        return null;
      }

      const blockedUntil = new Date(blockedUntilMs);

      if (blockedUntil.getTime() <= Date.now()) {
        return null;
      }

      return blockedUntil;
    } catch (err) {
      logger.warn({ err }, "Failed to read GitHub rate-limit cache");
      return null;
    }
  }

  async setRateLimitBlockedUntil(blockedUntil: Date): Promise<void> {
    if (!redis.isOpen) {
      return;
    }

    const blockedUntilMs = blockedUntil.getTime();

    if (!Number.isFinite(blockedUntilMs) || blockedUntilMs <= Date.now()) {
      return;
    }

    const ttlSeconds = Math.max(
      1,
      Math.ceil((blockedUntilMs - Date.now()) / 1000),
    );

    try {
      await redis.set(RATE_LIMIT_BLOCKED_UNTIL_KEY, String(blockedUntilMs), {
        expiration: { type: "EX", value: ttlSeconds },
      });
    } catch (err) {
      logger.warn({ err }, "Failed to write GitHub rate-limit cache");
    }
  }
}

export default new GithubCache();
