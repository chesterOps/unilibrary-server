import express from "express";
import { protect, authorize } from "../middlewares/auth.middleware";
import {
  getHistory,
  getLecturerStats,
  getUserStats,
} from "../controllers/users.controller";

const usersRouter = express.Router();

usersRouter.get(
  "/lecturer-stats",
  protect,
  authorize("lecturer", "admin"),
  getLecturerStats,
);
usersRouter.get("/stats", protect, getUserStats);
usersRouter.get("/history", protect, getHistory);

export default usersRouter;
