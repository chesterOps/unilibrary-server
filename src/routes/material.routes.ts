import express from "express";
import {
  uploadMaterial,
  getMaterials,
  getMaterial,
  logView,
  deleteMaterial,
  getMyUploads,
  getMaterialRecommendations,
} from "../controllers/material.controller";
import { protect, authorize } from "../middlewares/auth.middleware";

const materialRouter = express.Router();

materialRouter.get(
  "/my-uploads",
  protect,
  authorize("lecturer", "admin"),
  getMyUploads,
);
materialRouter.post(
  "/upload",
  protect,
  authorize("lecturer", "admin"),
  uploadMaterial,
);

materialRouter
  .route("/")
  .get(getMaterials)
  .post(protect, authorize("lecturer", "admin"), uploadMaterial);

materialRouter.get("/:id/recommendations", getMaterialRecommendations);
materialRouter.route("/:id").get(getMaterial).delete(protect, deleteMaterial);

materialRouter.post("/:id/view", protect, logView);

export default materialRouter;
