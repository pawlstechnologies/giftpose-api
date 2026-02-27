export default class ApiError extends Error {
  statusCode: number;
  isOperational: boolean;
  errors?: any;

  constructor(statusCode: number, message: string, errors?: any) {
    super(message);

    this.statusCode = statusCode;
    this.errors = errors;
    this.isOperational = true;

    Object.setPrototypeOf(this, new.target.prototype);

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}