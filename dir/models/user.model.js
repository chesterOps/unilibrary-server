"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const crypto_1 = __importDefault(require("crypto"));
const mongoose_1 = __importDefault(require("mongoose"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const userSchema = new mongoose_1.default.Schema({
    name: {
        type: String,
        required: [true, "Name is required"],
        trim: true,
    },
    email: {
        type: String,
        required: [true, "Email is required"],
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^\S+@\S+\.\S+$/, "Please provide a valid email address"],
    },
    password: {
        type: String,
        required: [true, "Password is required"],
        minlength: [8, "Password must be at least 8 characters"],
        select: false,
    },
    role: {
        type: String,
        enum: {
            values: ["student", "lecturer", "admin"],
            message: "Role must be student, lecturer, or admin",
        },
        default: "student",
    },
    approved: {
        type: Boolean,
        default: false,
    },
    department: {
        type: String,
        required: [true, "Department is required"],
        trim: true,
    },
    level: {
        type: Number,
        enum: {
            values: [100, 200, 300, 400, 500],
            message: "Level must be 100, 200, 300, 400, or 500",
        },
    },
    courses: {
        type: [String],
        default: [],
    },
    passwordResetToken: {
        type: String,
        select: false,
    },
    passwordResetExpires: {
        type: Date,
        select: false,
    },
}, { timestamps: true });
userSchema.index({ email: 1 });
userSchema.index({ department: 1, role: 1 });
userSchema.pre("save", async function (next) {
    if (!this.isModified("password"))
        return next();
    this.password = await bcryptjs_1.default.hash(this.password, 10);
    next();
});
userSchema.methods.comparePassword = async function (candidate) {
    return bcryptjs_1.default.compare(candidate, this.password);
};
userSchema.methods.createPasswordResetToken = function () {
    const resetToken = crypto_1.default.randomBytes(32).toString("hex");
    // Store only the hashed version — plain token is sent to the user (here: console)
    this.passwordResetToken = crypto_1.default
        .createHash("sha256")
        .update(resetToken)
        .digest("hex");
    this.passwordResetExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 min
    return resetToken;
};
const User = mongoose_1.default.model("User", userSchema);
exports.default = User;
