"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMe = exports.resetPassword = exports.forgotPassword = exports.login = exports.register = void 0;
const crypto_1 = __importDefault(require("crypto"));
const user_model_1 = __importDefault(require("../models/user.model"));
const appError_1 = __importDefault(require("../utils/appError"));
const catchAsync_1 = __importDefault(require("../utils/catchAsync"));
const jwt_1 = require("../utils/jwt");
// ── Helpers ───────────────────────────────────────────────────────────────────
const safeUser = (user) => ({
    _id: user._id,
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    approved: user.approved,
    department: user.department,
    level: user.level,
    courses: user.courses,
    createdAt: user.createdAt,
});
const sendTokenResponse = (user, statusCode, res) => {
    const token = (0, jwt_1.signToken)(user._id.toString());
    res.status(statusCode).json({
        status: "success",
        token,
        data: { user: safeUser(user) },
    });
};
// ── Controllers ───────────────────────────────────────────────────────────────
exports.register = (0, catchAsync_1.default)(async (req, res, next) => {
    const { name, email, password, role, department, level, courses } = req.body;
    if (role === "student" && !level) {
        return next(new appError_1.default("Level is required for students.", 400));
    }
    const user = await user_model_1.default.create({
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
});
exports.login = (0, catchAsync_1.default)(async (req, res, next) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return next(new appError_1.default("Please provide your email and password.", 400));
    }
    // password has select:false — must opt in explicitly
    const user = await user_model_1.default.findOne({ email }).select("+password");
    if (!user || !(await user.comparePassword(password))) {
        return next(new appError_1.default("Incorrect email or password.", 401));
    }
    if (!user.approved) {
        return next(new appError_1.default("Your account is pending admin approval", 403));
    }
    const token = (0, jwt_1.signToken)(user._id.toString());
    res.status(200).json({
        status: "success",
        token,
        user: safeUser(user),
        data: { user: safeUser(user) },
    });
});
exports.forgotPassword = (0, catchAsync_1.default)(async (req, res, next) => {
    const { email } = req.body;
    if (!email) {
        return next(new appError_1.default("Please provide your email address.", 400));
    }
    const user = await user_model_1.default.findOne({ email });
    // Always return the same message — don't reveal whether the email exists
    const genericMessage = "If that email address is registered, a password reset token has been logged to the console.";
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
});
exports.resetPassword = (0, catchAsync_1.default)(async (req, res, next) => {
    const hashedToken = crypto_1.default
        .createHash("sha256")
        .update(req.params.token)
        .digest("hex");
    const user = await user_model_1.default.findOne({
        passwordResetToken: hashedToken,
        passwordResetExpires: { $gt: Date.now() },
    }).select("+passwordResetToken +passwordResetExpires");
    if (!user) {
        return next(new appError_1.default("Token is invalid or has expired.", 400));
    }
    user.password = req.body.password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();
    sendTokenResponse(user, 200, res);
});
exports.getMe = (0, catchAsync_1.default)(async (req, res, _next) => {
    res.status(200).json({
        status: "success",
        data: { user: safeUser(req.user) },
    });
});
