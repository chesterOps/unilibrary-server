"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = errorHandler;
const appError_1 = __importDefault(require("./appError"));
// Development error
const devError = (err, res) => {
    res.status(err.statusCode).json({
        status: err.status,
        message: err.message,
        error: err,
        stack: err.stack,
    });
};
// Production error
const prodError = (err, res) => {
    // Operational error
    if (err.isOperational) {
        let response = {
            status: err.status,
            message: err.message,
        };
        // Errors object
        if (err.errors)
            response.error = { errors: err.errors };
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
function errorHandler(err, _req, res, _next) {
    // Set status code
    err.statusCode = err.statusCode || 500;
    // Set status
    err.status = err.status || "error";
    // App error
    let appError;
    // Validation error
    if (err.name === "ValidationError") {
        // Errors object
        const errors = {};
        // Populate errors object
        Object.values(err.errors).map((error) => {
            errors[error.path] = error.message;
        });
        // Ovewrite error with custom error
        appError = new appError_1.default("Validation error", 400, errors);
    }
    // Duplicate field error
    if (err.code === 11000) {
        // Errors object
        const errors = {};
        // Field
        const field = Object.keys(err.keyValue)[0];
        // Custom error
        errors[field] = `${field.charAt(0).toUpperCase() + field.slice(1)} already exists`;
        // Ovewrite with custom error
        appError = new appError_1.default("Duplicate field error", 400, errors);
    }
    // Check environment
    if (process.env.NODE_ENV === "development") {
        // Send response with dev error
        devError(appError || err, res);
    }
    else if (process.env.NODE_ENV === "production") {
        // Custom errors
        switch (err.name) {
            case "CastError":
                appError = new appError_1.default(`Invalid ${err.path}: ${err.value}`, 400);
                break;
            case "JsonWebTokenError":
                appError = new appError_1.default(`Invalid token`, 401);
                break;
            case "TokenExpiredError":
                appError = new appError_1.default("Token has expired", 401);
                break;
            default:
        }
        // Send response with production error
        prodError(appError || err, res);
    }
}
