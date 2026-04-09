import { NextFunction, Request, Response } from "express";
import { env } from "../../config/env";

export function apiKeyMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const apiKey = req.header("x-api-key");

  if (!apiKey || apiKey !== env.API_KEY) {
    return res.status(401).json({
      message: "Invalid API key",
    });
  }

  next();
}
