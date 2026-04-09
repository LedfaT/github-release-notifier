import { createClient } from "redis";
import { env } from "./env";
import { createLogger } from "./logger";

export const redis = createClient({
  url: env.REDIS_URL,
});

const logger = createLogger("redis client");

redis.on("error", (err) => {
  logger.error({ err }, "Redis error");
});

export async function connectRedis(): Promise<void> {
  if (redis.isOpen) {
    return;
  }

  try {
    await redis.connect();
    logger.info("Redis connected");
  } catch (err) {
    logger.warn({ err }, "Redis is unavailable, cache will be disabled");
  }
}
