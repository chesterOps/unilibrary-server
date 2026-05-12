import express, { Request, Response, NextFunction } from "express";
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
import upload from "../middlewares/multer";
import cloudinary from "../config/cloudinary";

const materialRouter = express.Router();

const handleFileUpload = async (req: Request, _res: Response, next: NextFunction) => {
  try {
    if (req.file) {
      const timestamp = Date.now();
      const safeName = req.file.originalname.replace(/[^a-zA-Z0-9.]/g, "_");
      const publicId = `unilibrary/files/${timestamp}-${safeName}`;

      const result = await new Promise<any>((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { resource_type: "raw", public_id: publicId },
          (err, res) => (err ? reject(err) : resolve(res)),
        );
        stream.end(req.file!.buffer);
      });

      req.body.fileUrl = result.secure_url;
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

export default materialRouter;
