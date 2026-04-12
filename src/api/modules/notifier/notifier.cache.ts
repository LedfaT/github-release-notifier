import crypto from "node:crypto";
import { createLogger } from "../../../config/logger";
import { redis } from "../../../config/redis";

const logger = createLogger("notifier-cache");
const UNDELIVERED_MESSAGES_KEY = "notifier:undelivered_messages";

export interface UndeliveredReleaseMessageRecord {
  id: string;
  email: string;
  repository: string;
  tagName: string;
  releaseUrl: string;
  subject: string;
  errorMessage: string;
  failedAt: string;
}

type NewUndeliveredReleaseMessageRecord = Omit<
  UndeliveredReleaseMessageRecord,
  "id" | "failedAt"
>;

class NotifierCache {
  async addUndeliveredReleaseMessage(
    input: NewUndeliveredReleaseMessageRecord,
  ): Promise<void> {
    if (!redis.isOpen) {
      return;
    }

    const id = crypto.randomUUID();
    const record: UndeliveredReleaseMessageRecord = {
      ...input,
      id,
      failedAt: new Date().toISOString(),
    };

    try {
      await redis.hSet(UNDELIVERED_MESSAGES_KEY, id, JSON.stringify(record));
      await redis.expire(UNDELIVERED_MESSAGES_KEY, 3600); // 1 hour
    } catch (err) {
      logger.warn(
        { err, key: UNDELIVERED_MESSAGES_KEY, id },
        "Failed to write undelivered message to cache",
      );
    }
  }

  async listUndeliveredReleaseMessages(): Promise<
    UndeliveredReleaseMessageRecord[]
  > {
    if (!redis.isOpen) {
      return [];
    }

    try {
      const map = await redis.hGetAll(UNDELIVERED_MESSAGES_KEY);
      const records: UndeliveredReleaseMessageRecord[] = [];

      for (const [id, rawValue] of Object.entries(map)) {
        try {
          const parsed = JSON.parse(
            rawValue,
          ) as Partial<UndeliveredReleaseMessageRecord>;

          if (
            typeof parsed.email !== "string" ||
            typeof parsed.repository !== "string" ||
            typeof parsed.tagName !== "string" ||
            typeof parsed.releaseUrl !== "string" ||
            typeof parsed.subject !== "string" ||
            typeof parsed.errorMessage !== "string" ||
            typeof parsed.failedAt !== "string"
          ) {
            continue;
          }

          records.push({
            id,
            email: parsed.email,
            repository: parsed.repository,
            tagName: parsed.tagName,
            releaseUrl: parsed.releaseUrl,
            subject: parsed.subject,
            errorMessage: parsed.errorMessage,
            failedAt: parsed.failedAt,
          });
        } catch {
          continue;
        }
      }

      records.sort((a, b) => {
        const left = new Date(a.failedAt).getTime();
        const right = new Date(b.failedAt).getTime();
        return left - right;
      });

      return records;
    } catch (err) {
      logger.warn({ err }, "Failed to read undelivered messages from cache");
      return [];
    }
  }

  async removeUndeliveredReleaseMessage(id: string): Promise<void> {
    if (!redis.isOpen) {
      return;
    }

    try {
      await redis.hDel(UNDELIVERED_MESSAGES_KEY, [id]);
    } catch (err) {
      logger.warn(
        { err, key: UNDELIVERED_MESSAGES_KEY, id },
        "Failed to remove undelivered message from cache",
      );
    }
  }
}

export default new NotifierCache();
