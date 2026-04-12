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
- Each scanner cycle does the following in order:
  1. Retries queued undelivered release emails from Redis cache.
  2. Checks global GitHub rate-limit cache.
  3. If GitHub is available, scans repositories:
     - fetch latest release from GitHub,
     - compare against `lastSeenTag`,
     - notify active subscribers on change,
     - update scan state in DB.
- If a global GitHub block is active, scanner skips repository scanning for this cycle.
- If GitHub rate limit is hit during scanning, scanner caches unblock time and stops the current cycle immediately.

### Cache and rate-limit behavior

Redis is used for three independent cache responsibilities:

1. Repository existence cache:
   - key format: `github:repo_exists:<owner/repo>`
   - stores `1` or `0` for repository existence checks in subscription flow

2. Global GitHub rate-limit block cache:
   - key: `github:rate_limit:blocked_until`
   - stores unblock timestamp derived from GitHub headers (`x-ratelimit-reset` or `retry-after`)
   - checked before any GitHub API request (both subscription and scanner)
   - while active:
     - subscription returns `429` with retry details,
     - scanner skips GitHub scanning

3. Undelivered release notifications queue (hash map):
   - key: `notifier:undelivered_messages`
   - contains only failed **new release** email deliveries
   - entries are retried at the start of each scanner cycle
   - successful retry removes entry from hash
   - failed retry keeps entry for next cycle

### Rate-limit propagation

- Any `429` (or `403` with `x-ratelimit-remaining=0`) from GitHub is treated as rate limit.
- Unblock time is written to global cache immediately.
- This makes behavior consistent across all flows:
  - if limit is hit during subscription, next scanner cycle also sees the block;
  - if limit is hit during scanner, new subscription checks also see the block.

### TTL

- Cache TTL is controlled by `REDIS_TTL`.
- For global rate-limit key, effective TTL is reduced to the exact remaining unblock window.

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
