"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authorize = exports.optionalProtect = exports.protect = void 0;
const user_model_1 = __importDefault(require("../models/user.model"));
const appError_1 = __importDefault(require("../utils/appError"));
const catchAsync_1 = __importDefault(require("../utils/catchAsync"));
const jwt_1 = require("../utils/jwt");
/**
 * Verifies the Bearer JWT from the Authorization header and attaches
 * the authenticated user to req.user. Must run before any route that
 * needs an identity.
 */
exports.protect = (0, catchAsync_1.default)(async (req, _res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return next(new appError_1.default("You are not logged in. Please log in to get access.", 401));
    }
    const token = authHeader.split(" ")[1];
    // Throws JsonWebTokenError / TokenExpiredError — both handled by errorHandler
    const decoded = (0, jwt_1.verifyToken)(token);
    const user = await user_model_1.default.findById(decoded.id);
    if (!user) {
        return next(new appError_1.default("The account belonging to this token no longer exists.", 401));
    }
    req.user = user;
    next();
});
exports.optionalProtect = (0, catchAsync_1.default)(async (req, _res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        next();
        return;
    }
    if (!authHeader.startsWith("Bearer ")) {
        return next(new appError_1.default("Invalid authorization header format.", 401));
    }
    const token = authHeader.split(" ")[1];
    const decoded = (0, jwt_1.verifyToken)(token);
    const user = await user_model_1.default.findById(decoded.id);
    if (!user) {
        return next(new appError_1.default("The account belonging to this token no longer exists.", 401));
    }
    req.user = user;
    next();
});
/**
 * Restricts a route to specific roles. Must be used after `protect`
 * since it depends on req.user being set.
 *
 * Usage: router.delete("/x", protect, authorize("admin"), handler)
 */
const authorize = (...roles) => {
    return (req, _res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return next(new appError_1.default(`Access denied. This route is restricted to: ${roles.join(", ")}.`, 403));
        }
        next();
    };
};
exports.authorize = authorize;
