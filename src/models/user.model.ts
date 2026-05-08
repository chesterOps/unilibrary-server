import crypto from "crypto";
import mongoose, {
  Document,
  HydratedDocument,
  CallbackWithoutResultAndOptionalError,
} from "mongoose";
import bcrypt from "bcryptjs";

export type UserRole = "student" | "lecturer" | "admin";
export type AcademicLevel = 100 | 200 | 300 | 400 | 500;

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  department: string;
  level?: AcademicLevel;
  courses: string[];
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidate: string): Promise<boolean>;
  createPasswordResetToken(): string;
}

const userSchema = new mongoose.Schema<IUser>(
  {
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
  },
  { timestamps: true },
);

userSchema.index({ email: 1 });
userSchema.index({ department: 1, role: 1 });

userSchema.pre(
  "save",
  async function (
    this: HydratedDocument<IUser>,
    next: CallbackWithoutResultAndOptionalError,
  ) {
    if (!this.isModified("password")) return next();
    this.password = await bcrypt.hash(this.password, 12);
    next();
  },
);

userSchema.methods.comparePassword = async function (
  this: HydratedDocument<IUser>,
  candidate: string,
): Promise<boolean> {
  return bcrypt.compare(candidate, this.password);
};

userSchema.methods.createPasswordResetToken = function (
  this: HydratedDocument<IUser>,
): string {
  const resetToken = crypto.randomBytes(32).toString("hex");

  // Store only the hashed version — plain token is sent to the user (here: console)
  this.passwordResetToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  this.passwordResetExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 min

  return resetToken;
};

const User = mongoose.model<IUser>("User", userSchema);
export default User;
