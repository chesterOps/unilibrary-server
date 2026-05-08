import express from "express";
import {
  uploadMaterial,
  getMaterials,
  getMaterial,
  logView,
} from "../controllers/material.controller";
import { protect, authorize } from "../middlewares/auth.middleware";

const materialRouter = express.Router();

materialRouter
  .route("/")
  .get(getMaterials)
  .post(protect, authorize("lecturer", "admin"), uploadMaterial);

materialRouter.route("/:id").get(getMaterial);

materialRouter.post("/:id/view", protect, logView);

export default materialRouter;
