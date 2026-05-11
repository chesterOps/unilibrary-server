import crypto from "crypto";
import { Request, Response, NextFunction } from "express";
import User, { IUser } from "../models/user.model";
import AppError from "../utils/appError";
import catchAsync from "../utils/catchAsync";
import { signToken } from "../utils/jwt";

// ── Helpers ───────────────────────────────────────────────────────────────────

const safeUser = (user: IUser) => ({
  _id: user._id,
  id: (user._id as string).toString(),
  name: user.name,
  email: user.email,
  role: user.role,
  approved: user.approved,
  department: user.department,
  level: user.level,
  courses: user.courses,
  createdAt: user.createdAt,
});

const sendTokenResponse = (
  user: IUser,
  statusCode: number,
  res: Response,
): void => {
  const token = signToken((user._id as string).toString());

  res.status(statusCode).json({
    status: "success",
    token,
    data: { user: safeUser(user) },
  });
};

// ── Controllers ───────────────────────────────────────────────────────────────

export const register = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { name, email, password, role, department, level, courses } =
      req.body;

    if (role === "student" && !level) {
      return next(new AppError("Level is required for students.", 400));
    }

    const user = await User.create({
      name,
      email,
      password,
      role,
      department,
      level,
      courses,
      approved: false,
    });

    res.status(201).json({
      status: "success",
      message: "Account created successfully. Awaiting admin approval.",
      data: { user: safeUser(user) },
    });
  },
);

export const login = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { email, password } = req.body;

    if (!email || !password) {
      return next(new AppError("Please provide your email and password.", 400));
    }

    // password has select:false — must opt in explicitly
    const user = await User.findOne({ email }).select("+password");

    if (!user || !(await user.comparePassword(password))) {
      return next(new AppError("Incorrect email or password.", 401));
    }

    // Admins bypass approval requirement (allows first admin to login)
    if (!user.approved && user.role !== "admin") {
      return next(new AppError("Your account is pending admin approval", 403));
    }

    const token = signToken((user._id as string).toString());

    res.status(200).json({
      status: "success",
      token,
      user: safeUser(user),
      data: { user: safeUser(user) },
    });
  },
);

export const forgotPassword = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { email } = req.body;

    if (!email) {
      return next(new AppError("Please provide your email address.", 400));
    }

    const user = await User.findOne({ email });

    // Always return the same message — don't reveal whether the email exists
    const genericMessage =
      "If that email address is registered, a password reset token has been logged to the console.";

    if (!user) {
      res.status(200).json({ status: "success", message: genericMessage });
      return;
    }

    const resetToken = user.createPasswordResetToken();
    // Skip all other validators — only the reset fields are changing
    await user.save({ validateBeforeSave: false });

    console.log("\n====== PASSWORD RESET TOKEN ======");
    console.log(`  Email      : ${user.email}`);
    console.log(`  Token      : ${resetToken}`);
    console.log(`  Expires at : ${user.passwordResetExpires}`);
    console.log("==================================\n");

    res.status(200).json({ status: "success", message: genericMessage });
  },
);

export const resetPassword = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const hashedToken = crypto
      .createHash("sha256")
      .update(req.params.token)
      .digest("hex");

    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() },
    }).select("+passwordResetToken +passwordResetExpires");

    if (!user) {
      return next(new AppError("Token is invalid or has expired.", 400));
    }

    user.password = req.body.password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    sendTokenResponse(user, 200, res);
  },
);

export const getMe = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    res.status(200).json({
      status: "success",
      data: { user: safeUser(req.user!) },
    });
  },
);
