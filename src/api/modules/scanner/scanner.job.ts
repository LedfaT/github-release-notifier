import { env } from "../../../config/env";
import { createLogger } from "../../../config/logger";
import scannerService from "./scanner.service";
import cron from "node-cron";

const logger = createLogger("scanner-job");

const DEFAULT_SCANNER_CRON = "*/5 * * * *";

function resolveScannerCron(): string {
  const fromEnv = env.SCANNER_CRON?.trim();

  if (fromEnv) {
    if (cron.validate(fromEnv)) {
      return fromEnv;
    }

    logger.warn(
      { scannerCron: fromEnv },
      "Invalid SCANNER_CRON, using fallback",
    );
  }
  return DEFAULT_SCANNER_CRON;
}

export function startScannerJob(): () => void {
  const scannerCron = resolveScannerCron();
  let isRunning = false;

  const run = async () => {
    if (isRunning) {
      logger.warn(
        "Scanner cycle skipped because previous cycle is still running",
      );
      return;
    }

    isRunning = true;

    try {
      await scannerService.runOnce();
    } catch (err) {
      logger.error({ err }, "Scanner cycle failed");
    } finally {
      isRunning = false;
    }
  };

  const task = cron.schedule(scannerCron, () => {
    void run();
  });

  void run();

  logger.info({ scannerCron }, "Scanner job started");

  return () => {
    task.stop();
    logger.info("Scanner job stopped");
  };
}
