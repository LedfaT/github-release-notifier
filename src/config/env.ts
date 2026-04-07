import { z } from "zod";
import dotenv from "dotenv";

dotenv.config({
  quiet: true,
});

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),

  PORT: z.coerce.number().default(3000),

  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),

  REDIS_URL: z.string().min(1, "REDIS_URL is required"),

  GITHUB_TOKEN: z.string().optional(),
  GITHUB_API_BASE_URL: z.string().default("https://api.github.com"),

  SMTP_HOST: z.string().min(1, "SMTP_HOST is required"),
  SMTP_PORT: z.coerce.number().default(1025),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  MAIL_FROM: z.email(),

  APP_BASE_URL: z.url(),

  SCANNER_INTERVAL_MS: z.coerce.number().default(300000),

  API_KEY: z.string().min(1, "API_KEY is required"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Invalid environment variables:");
  console.error(z.treeifyError(parsed.error));
  process.exit(1);
}

export const env = parsed.data;
