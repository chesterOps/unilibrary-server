import { Request, Response, NextFunction } from "express";
import User from "../models/user.model";
import type { UserRole } from "../models/user.model";
import AppError from "../utils/appError";
import catchAsync from "../utils/catchAsync";
import { verifyToken } from "../utils/jwt";

/**
 * Verifies the Bearer JWT from the Authorization header and attaches
 * the authenticated user to req.user. Must run before any route that
 * needs an identity.
 */
export const protect = catchAsync(
  async (req: Request, _res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return next(
        new AppError("You are not logged in. Please log in to get access.", 401),
      );
    }

    const token = authHeader.split(" ")[1];

    // Throws JsonWebTokenError / TokenExpiredError — both handled by errorHandler
    const decoded = verifyToken(token);

    const user = await User.findById(decoded.id);
    if (!user) {
      return next(
        new AppError(
          "The account belonging to this token no longer exists.",
          401,
        ),
      );
    }

    req.user = user;
    next();
  },
);

/**
 * Restricts a route to specific roles. Must be used after `protect`
 * since it depends on req.user being set.
 *
 * Usage: router.delete("/x", protect, authorize("admin"), handler)
 */
export const authorize = (...roles: UserRole[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(
        new AppError(
          `Access denied. This route is restricted to: ${roles.join(", ")}.`,
          403,
        ),
      );
    }
    next();
  };
};
