import { createApp } from "./app";
import { env } from "./config/env";
import { createLogger } from "./config/logger";

async function bootstrap() {
  const app = createApp();
  const logger = createLogger("server");

  app.listen(env.PORT, () => {
    logger.info(`Server started on port ${env.PORT}`);
  });
}

bootstrap();
