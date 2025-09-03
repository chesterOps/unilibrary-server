import AppError from "./appError";
import { NextFunction, Request, Response } from "express";

// Development error
const devError = (err: any, res: Response) => {
  res.status(err.statusCode).json({
    status: err.status,
    message: err.message,
    error: err,
    stack: err.stack,
  });
};

// Production error
const prodError = (err: any, res: Response) => {
  // Operational error
  if (err.isOperational) {
    let response: {
      status: string;
      message: string;
      error?: { errors: { [key: string]: any } };
    } = {
      status: err.status,
      message: err.message,
    };

    // Errors object
    if (err.errors) response.error = { errors: err.errors };

    // Send response
    return res.status(err.statusCode || 500).json(response);
  }

  // Programming or unknown error
  console.error("Error:", err);

  // Send response
  res.status(500).json({
    status: "error",
    message: "Internal server error",
  });
};

// Global error middleware
export default function errorHandler(
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  // Set status code
  err.statusCode = err.statusCode || 500;

  // Set status
  err.status = err.status || "error";

  // App error
  let appError;

  // Validation error
  if (err.name === "ValidationError") {
    // Errors object
    const errors: { [key: string]: any } = {};

    // Populate errors object
    Object.values(err.errors).map((error: any) => {
      errors[error.path] = error.message;
    });

    // Ovewrite error with custom error
    appError = new AppError("Validation error", 400, errors);
  }

  // Duplicate field error
  if (err.code === 11000) {
    // Errors object
    const errors: { [key: string]: any } = {};

    // Field
    const field = Object.keys(err.keyValue)[0];

    // Custom error
    errors[field] = `${
      field.charAt(0).toUpperCase() + field.slice(1)
    } already exists`;

    // Ovewrite with custom error
    appError = new AppError("Duplicate field error", 400, errors);
  }

  // Check environment
  if (process.env.NODE_ENV === "development") {
    // Send response with dev error

    devError(appError || err, res);
  } else if (process.env.NODE_ENV === "production") {
    // Custom errors
    switch (err.name) {
      case "CastError":
        appError = new AppError(`Invalid ${err.path}: ${err.value}`, 400);
        break;

      case "JsonWebTokenError":
        appError = new AppError(`Invalid token`, 401);
        break;

      case "TokenExpiredError":
        appError = new AppError("Token has expired", 401);
        break;
      default:
    }

    // Send response with production error
    prodError(appError || err, res);
  }
}
