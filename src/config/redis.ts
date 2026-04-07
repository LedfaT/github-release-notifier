import { createClient } from "redis";
import { env } from "./env";
import { createLogger } from "./logger";

export const redis = createClient({
  url: env.REDIS_URL,
});

const logger = createLogger("redis client");

redis.on("error", (err) => {
  logger.error("Redis error:", err);
});
