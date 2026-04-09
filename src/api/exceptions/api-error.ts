export default class ApiError extends Error {
  status: number;
  statusCode: number;
  errors: unknown[];

  constructor(status: number, message: string, errors: unknown[] = []) {
    super(message);
    this.status = status;
    this.statusCode = status;
    this.errors = errors;
  }

  static notFound(message: string) {
    return new ApiError(404, message);
  }

  static BadRequest(message: string, errors: unknown[] = []) {
    return new ApiError(400, message, errors);
  }
}
