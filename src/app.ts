import express from "express";
import helmet from "helmet";
import cors from "cors";
import morgan from "morgan";
import path from "node:path";
import { promises as fs } from "node:fs";
import { errorMiddleware } from "./api/middlewares/error.middleware";
import { requestMetricsMiddleware } from "./api/middlewares/request-metrics.middleware";
import metricsRouter from "./api/routes/metrics.routes";
import subscriptionRouter from "./api/routes/subscription.routes";
import { env } from "./config/env";

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors());
  app.use(express.json());
  app.use(morgan("dev"));
  app.use(requestMetricsMiddleware);

  app.get("/index.html", (_req, res) => {
    return res.redirect(301, "/");
  });

  app.get("/", async (req, res, next) => {
    if (req.path === "/" && req.originalUrl !== "/") {
      return res.redirect(301, "/");
    }

    try {
      const htmlPath = path.join(process.cwd(), "public", "index.html");
      const template = await fs.readFile(htmlPath, "utf8");
      const page = template.replace("__API_KEY__", env.API_KEY);
      res.type("html").send(page);
    } catch (error) {
      next(error);
    }
  });

  app.use(express.static("public"));

  app.use(metricsRouter);
  app.use("/api", subscriptionRouter);

  app.use(errorMiddleware);

  return app;
}
