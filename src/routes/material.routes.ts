import express, { Request, Response, NextFunction } from "express";
import {
  uploadMaterial,
  getMaterials,
  getMaterial,
  logView,
  logDownload,
  deleteMaterial,
  getMyUploads,
  getMaterialRecommendations,
} from "../controllers/material.controller";
import { protect, authorize } from "../middlewares/auth.middleware";
import upload from "../middlewares/multer";
import { uploadToMega } from "../utils/handlerMega";

const materialRouter = express.Router();

const handleFileUpload = async (req: Request, _res: Response, next: NextFunction) => {
  try {
    if (req.file) {
      const result = await uploadToMega(req.file.buffer, req.file.originalname) as any;
      req.body.fileUrl = result.url;
      req.body.fileName = req.file.originalname;
      req.body.fileType = req.file.mimetype.includes("pdf") ? "pdf" : req.file.mimetype.split("/")[1];
    }
    next();
  } catch (err: any) {
    next(err);
  }
};

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
  upload.single("file"),
  handleFileUpload,
  uploadMaterial,
);

materialRouter
  .route("/")
  .get(getMaterials)
  .post(protect, authorize("lecturer", "admin"), upload.single("file"), handleFileUpload, uploadMaterial);

materialRouter.get("/:id/recommendations", getMaterialRecommendations);
materialRouter.route("/:id").get(getMaterial).delete(protect, deleteMaterial);

materialRouter.post("/:id/view", protect, logView);
materialRouter.post("/:id/download", protect, logDownload);

export default materialRouter;
