import { createApp } from "./app";
import { env } from "./config/env";
import { createLogger } from "./config/logger";
import { connectRedis, redis } from "./config/redis";
import { startScannerJob } from "./api/modules/scanner/scanner.job";

let stopScanner: (() => void) | null = null;

async function bootstrap() {
  const app = createApp();
  const logger = createLogger("server");
  await connectRedis();
  stopScanner = startScannerJob();

  app.listen(env.PORT, () => {
    logger.info(`Server started on port ${env.PORT}`);
  });
}

bootstrap();

process.on("SIGINT", async () => {
  if (stopScanner) {
    stopScanner();
  }

  if (redis.isOpen) {
    await redis.quit();
  }

  process.exit(0);
});
