import { redis } from "../../../config/redis";
import { createLogger } from "../../../config/logger";
import { env } from "../../../config/env";

const logger = createLogger("github-cache");

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
}

export default new GithubCache();
