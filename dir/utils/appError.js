"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class AppError extends Error {
    constructor(message, statusCode, errors) {
        // Call parent Error constructor with message
        super(message);
        // Set status code
        this.statusCode = statusCode;
        // Set status based on type of error: client errors = "fail", server = "error"
        this.status = `${statusCode}`.startsWith("4") ? "fail" : "error";
        // Flag to identify known/handled errors
        this.isOperational = true;
        // Include structured error info (e.g., validation errors)
        if (errors)
            this.errors = errors;
        // Capture stack trace excluding constructor
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.default = AppError;
