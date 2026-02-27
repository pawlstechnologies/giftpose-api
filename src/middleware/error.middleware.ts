import { Request, Response, NextFunction } from "express";
import ApiError from "../utils/ApiError";


export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {

  const isDev = process.env.NODE_ENV === "development";

  // Custom API error
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      errors: err.errors ?? null,
      ...(isDev && { stack: err.stack })
    });
  }

  // Unknown / unexpected error
  console.error("UNEXPECTED ERROR:", err);

  return res.status(500).json({
    success: false,
    message: "Internal Server Error",
    ...(isDev && { stack: err.stack })
  });
};



