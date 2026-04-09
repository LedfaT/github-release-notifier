import { Request, Response, NextFunction } from "express";
import { createLogger } from "../../config/logger";

const logger = createLogger("error-middleware");

export function errorMiddleware(
  error: Error & { status?: number; errors?: unknown[] },
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  const statusCode = error.status ?? 500;

  logger.error(
    {
      err: error,
      statusCode,
      path: _req.path,
      method: _req.method,
    },
    "Request failed",
  );

  return res.status(statusCode).json({
    message: error.message || "Internal server error",
    errors: error.errors,
  });
}
