import express from "express";
import {
  getRecommendations,
  getPopular,
} from "../controllers/recommendation.controller";
import { optionalProtect } from "../middlewares/auth.middleware";

const recommendationRouter = express.Router();

// /popular must be registered before any /:param route to prevent Express
// from treating the literal string "popular" as a parameter value.
recommendationRouter.get("/popular", getPopular);

recommendationRouter.get("/", optionalProtect, getRecommendations);

export default recommendationRouter;
