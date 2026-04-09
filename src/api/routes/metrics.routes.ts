import { Router } from "express";
import { metricsRegistry } from "../../config/metrics";

const metricsRouter = Router();

metricsRouter.get("/metrics", async (_req, res) => {
  res.setHeader("Content-Type", metricsRegistry.contentType);
  res.end(await metricsRegistry.metrics());
});

export default metricsRouter;
