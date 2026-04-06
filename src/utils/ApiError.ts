export default class ApiError extends Error {
  statusCode: number;
  status: boolean;
  isOperational: boolean;
  errors?: any;

  constructor(statusCode: number, message: string, errors?: any) {
    super(message);

    this.statusCode = statusCode;
    this.status = false; // ✅ ADD THIS
    this.errors = errors;
    this.isOperational = true;

    Object.setPrototypeOf(this, new.target.prototype);

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}