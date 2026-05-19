"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const material_controller_1 = require("../controllers/material.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const multer_1 = __importDefault(require("../middlewares/multer"));
const handlerMega_1 = require("../utils/handlerMega");
const materialRouter = express_1.default.Router();
const handleFileUpload = async (req, _res, next) => {
    try {
        if (req.file) {
            const result = await (0, handlerMega_1.uploadToMega)(req.file.buffer, req.file.originalname);
            req.body.fileUrl = result.url;
            req.body.fileName = req.file.originalname;
            req.body.fileType = req.file.mimetype.includes("pdf") ? "pdf" : req.file.mimetype.split("/")[1];
        }
        next();
    }
    catch (err) {
        next(err);
    }
};
materialRouter.get("/my-uploads", auth_middleware_1.protect, (0, auth_middleware_1.authorize)("lecturer", "admin"), material_controller_1.getMyUploads);
materialRouter.post("/upload", auth_middleware_1.protect, (0, auth_middleware_1.authorize)("lecturer", "admin"), multer_1.default.single("file"), handleFileUpload, material_controller_1.uploadMaterial);
materialRouter
    .route("/")
    .get(material_controller_1.getMaterials)
    .post(auth_middleware_1.protect, (0, auth_middleware_1.authorize)("lecturer", "admin"), multer_1.default.single("file"), handleFileUpload, material_controller_1.uploadMaterial);
materialRouter.get("/:id/recommendations", material_controller_1.getMaterialRecommendations);
materialRouter.route("/:id").get(material_controller_1.getMaterial).delete(auth_middleware_1.protect, material_controller_1.deleteMaterial);
materialRouter.post("/:id/view", auth_middleware_1.protect, material_controller_1.logView);
materialRouter.post("/:id/download", auth_middleware_1.protect, material_controller_1.logDownload);
exports.default = materialRouter;
