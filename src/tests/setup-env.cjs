process.env.NODE_ENV = "test";
process.env.PORT = "3000";
process.env.DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgres://postgres:postgres@localhost:5432/github_notifier_test";
process.env.REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
process.env.GITHUB_API_BASE_URL =
  process.env.GITHUB_API_BASE_URL || "https://api.github.com";
process.env.SMTP_HOST = process.env.SMTP_HOST || "localhost";
process.env.SMTP_PORT = process.env.SMTP_PORT || "1025";
process.env.MAIL_FROM = process.env.MAIL_FROM || "no-reply@example.com";
process.env.APP_BASE_URL = process.env.APP_BASE_URL || "http://localhost:3000";
process.env.API_KEY = process.env.API_KEY || "test-api-key";
process.env.SCANNER_CRON = process.env.SCANNER_CRON || "*/5 * * * *";
