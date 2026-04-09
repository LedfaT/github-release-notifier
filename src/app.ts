import express from "express";
import helmet from "helmet";
import cors from "cors";
import morgan from "morgan";
import { errorMiddleware } from "./api/middlewares/error.middleware";
import { requestMetricsMiddleware } from "./api/middlewares/request-metrics.middleware";
import metricsRouter from "./api/routes/metrics.routes";
import subscriptionRouter from "./api/routes/subscription.routes";

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors());
  app.use(express.json());
  app.use(morgan("dev"));
  app.use(requestMetricsMiddleware);

  app.use(metricsRouter);
  app.use("/api", subscriptionRouter);

  app.use(errorMiddleware);

  return app;
}
