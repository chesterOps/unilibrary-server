import express from "express";
import {
  getRecommendations,
  getPopular,
} from "../controllers/recommendation.controller";
import { protect, authorize } from "../middlewares/auth.middleware";

const recommendationRouter = express.Router();

// /popular must be registered before any /:param route to prevent Express
// from treating the literal string "popular" as a parameter value.
recommendationRouter.get("/popular", getPopular);

recommendationRouter.get(
  "/",
  protect,
  authorize("student"),
  getRecommendations,
);

export default recommendationRouter;
