import express from "express";
import { protect, authorize } from "../middlewares/auth.middleware";
import { getDocuments, searchDocuments } from "../controllers/documents.controller";
import { uploadMaterial } from "../controllers/material.controller";
import { getLegacyRoleRecommendations } from "../controllers/recommendation.controller";

const documentsRouter = express.Router();

documentsRouter.get("/", getDocuments);
documentsRouter.post("/upload", protect, authorize("lecturer", "admin"), uploadMaterial);
documentsRouter.get("/search", searchDocuments);
documentsRouter.get("/recommendations", getLegacyRoleRecommendations);

export default documentsRouter;
