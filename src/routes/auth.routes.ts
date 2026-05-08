import express from "express";
import {
  register,
  login,
  forgotPassword,
  resetPassword,
  getMe,
} from "../controllers/auth.controller";
import { protect } from "../middlewares/auth.middleware";

const authRouter = express.Router();

authRouter.post("/register", register);
authRouter.post("/login", login);
authRouter.post("/forgot-password", forgotPassword);
authRouter.patch("/reset-password/:token", resetPassword);

// Protected routes — must be logged in
authRouter.use(protect);
authRouter.get("/me", getMe);

export default authRouter;
