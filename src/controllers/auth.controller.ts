import crypto from "crypto";
import { Request, Response, NextFunction } from "express";
import User, { IUser } from "../models/user.model";
import AppError from "../utils/appError";
import catchAsync from "../utils/catchAsync";
import { signToken } from "../utils/jwt";
import { buildPasswordResetUrl, sendEmail } from "../services/email.service";

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

    if (role === "admin") {
      return next(new AppError("Admin accounts cannot be created via registration.", 403));
    }

    if (role === "student" && !level) {
      return next(new AppError("Level is required for students.", 400));
    }

    const user = await User.create({
      name,
      email,
      password,
      role: role || "student",
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
      "If that email address is registered, a password reset link has been sent to your inbox.";

    if (!user) {
      res.status(200).json({ status: "success", message: genericMessage });
      return;
    }

    const resetToken = user.createPasswordResetToken();
    // Skip all other validators — only the reset fields are changing
    await user.save({ validateBeforeSave: false });

    console.log("\n====== PASSWORD RESET TOKEN ======");
    console.log(`  Email      : ${user.email}`);
    const resetUrl = buildPasswordResetUrl(resetToken);

    console.log(`  Reset URL  : ${resetUrl}`);
    console.log(`  Expires at : ${user.passwordResetExpires}`);
    console.log("==================================\n");

    try {
      await sendEmail({
        to: user.email,
        subject: "Reset your UniLibrary password",
        text: [
          `Hello ${user.name || "there"},`,
          "",
          "We received a request to reset your UniLibrary password.",
          `Use this link to choose a new password: ${resetUrl}`,
          "",
          "This link expires in 30 minutes. If you did not request it, you can ignore this email.",
        ].join("\n"),
        html: `
          <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #0f172a;">
            <h2 style="margin: 0 0 16px;">Reset your UniLibrary password</h2>
            <p>Hello ${user.name || "there"},</p>
            <p>We received a request to reset your UniLibrary password.</p>
            <p>
              <a href="${resetUrl}" style="display: inline-block; padding: 12px 18px; background: #234876; color: #ffffff; text-decoration: none; border-radius: 8px;">
                Reset password
              </a>
            </p>
            <p>This link expires in 30 minutes. If you did not request it, you can ignore this email.</p>
          </div>
        `,
      });
    } catch (err) {
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;
      await user.save({ validateBeforeSave: false });
      console.error("[Email] Password reset email failed:", err);
      return next(new AppError("Unable to send password reset email. Please try again later.", 500));
    }

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

    if (!req.body.password || String(req.body.password).length < 8) {
      return next(new AppError("Password must be at least 8 characters.", 400));
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
