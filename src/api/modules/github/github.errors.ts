export class GithubRateLimitError extends Error {
  readonly status = 429;
  readonly retryAfterSeconds?: number;
  readonly resetAt?: Date;

  constructor(input: {
    message: string;
    retryAfterSeconds?: number;
    resetAt?: Date;
  }) {
    super(input.message);
    this.retryAfterSeconds = input.retryAfterSeconds;
    this.resetAt = input.resetAt;
  }
}
