import { NextFunction, Request, Response } from "express";
import {
  httpRequestDurationSeconds,
  httpRequestsTotal,
} from "../../config/metrics";

function resolveRouteLabel(req: Request): string {
  if (req.route?.path) {
    return `${req.baseUrl}${req.route.path}` || req.route.path;
  }

  return "unmatched";
}

export function requestMetricsMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const start = process.hrtime.bigint();

  res.on("finish", () => {
    const durationSeconds = Number(process.hrtime.bigint() - start) / 1_000_000_000;
    const statusCode = String(res.statusCode);
    const route = resolveRouteLabel(req);
    const labels = {
      method: req.method,
      route,
      status_code: statusCode,
    };

    httpRequestsTotal.inc(labels);
    httpRequestDurationSeconds.observe(labels, durationSeconds);
  });

  next();
}
