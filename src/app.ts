import express from "express";
import helmet from "helmet";
import cors from "cors";
import morgan from "morgan";

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors());
  app.use(express.json());
  app.use(morgan("dev"));

  return app;
}
