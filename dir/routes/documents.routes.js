"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_middleware_1 = require("../middlewares/auth.middleware");
const documents_controller_1 = require("../controllers/documents.controller");
const material_controller_1 = require("../controllers/material.controller");
const recommendation_controller_1 = require("../controllers/recommendation.controller");
const documentsRouter = express_1.default.Router();
documentsRouter.get("/", documents_controller_1.getDocuments);
documentsRouter.post("/upload", auth_middleware_1.protect, (0, auth_middleware_1.authorize)("lecturer", "admin"), material_controller_1.uploadMaterial);
documentsRouter.get("/search", documents_controller_1.searchDocuments);
documentsRouter.get("/recommendations", recommendation_controller_1.getLegacyRoleRecommendations);
exports.default = documentsRouter;
