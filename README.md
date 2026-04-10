## Host

https://github-release-notifier-05wf.onrender.com

## Core logic

### Subscription flow

- `POST /api/subscribe` accepts `email` and `repository`.
- Repository format is validated as `owner/repo`.
- Repository existence is checked against GitHub.
- Subscription is stored as `pending`.
- Confirmation and unsubscribe tokens are generated, hashed, and stored.
- Confirmation email is sent with links:
  - `/api/confirm/:token`
  - `/api/unsubscribe/:token`

### Confirmation flow

- `GET /api/confirm/:token`
- Token is hashed and matched in DB.
- If valid and status is `pending`, subscription becomes `active`.

### Unsubscribe flow

- `GET /api/unsubscribe/:token`
- Token is hashed and matched in DB.
- Subscription status is set to `unsubscribed`.

### Scanner flow

- Cron expression is read from `SCANNER_CRON` (default: `*/5 * * * *`).
- Scanner also runs once immediately on startup.
- For each tracked repository:
  - fetch latest release from GitHub,
  - compare against `lastSeenTag`,
  - notify active subscribers on change,
  - update scan state in DB.
- If GitHub rate limit is hit, current scan cycle stops early.

### Caching

- Repository existence checks are cached in Redis.
- Cache TTL is controlled by `REDIS_TTL`.

## API

### `POST /api/subscribe`

Headers:

- `x-api-key: <API_KEY>`

Body:

```json
{
  "email": "user@example.com",
  "repository": "owner/repo"
}
```

### `GET /api/confirm/{token}`

Confirms a pending subscription.

### `GET /api/unsubscribe/{token}`

Unsubscribes from notifications.

### `GET /api/subscriptions?email={email}`

Headers:

- `x-api-key: <API_KEY>`

Returns active subscriptions for the email.

### `GET /metrics`

Prometheus metrics endpoint.

## Environment variables

Use `.env.example` as a template.

Configuration keys:

- `PORT`
- `NODE_ENV`
- `DATABASE_URL`
- `REDIS_URL`
- `REDIS_TTL`
- `GITHUB_TOKEN` (optional but recommended)
- `GITHUB_API_BASE_URL`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`
- `MAIL_FROM`
- `APP_BASE_URL`
- `SCANNER_CRON`
- `API_KEY`

## Local development

1. Install dependencies:

```bash
npm install
```

2. Create `.env` from `.env.example`.

3. Run migrations:

```bash
npm run migrate
```

4. Start in dev mode:

```bash
npm run dev
```

## Docker (production compose)

The main `docker-compose.yml` is configured for production behavior:

- separate one-off `migrate` service,
- `app` starts only after successful migrations,
- `db` and `redis` are internal services,
- only app port `3000` is published.

Run:

```bash
docker compose up --build -d
```
