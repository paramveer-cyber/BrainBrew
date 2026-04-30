export default class ApiError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
  }
  static badRequest(msg) { return new ApiError(msg, 400); }
  static unauthorized(msg = "Unauthorized") { return new ApiError(msg, 401); }
  static notFound(msg = "Not found") { return new ApiError(msg, 404); }
  static unknown(msg = "Unknown error") { return new ApiError(msg, 500); }
}
