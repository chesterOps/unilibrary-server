"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchDocuments = exports.getDocuments = void 0;
const material_model_1 = __importDefault(require("../models/material.model"));
const appError_1 = __importDefault(require("../utils/appError"));
const catchAsync_1 = __importDefault(require("../utils/catchAsync"));
const materialResponse_1 = require("../utils/materialResponse");
exports.getDocuments = (0, catchAsync_1.default)(async (_req, res, _next) => {
    const materials = (await material_model_1.default.find({ approved: true })
        .sort("-createdAt")
        .populate("uploadedBy", "name email role")).map(materialResponse_1.normalizeMaterial);
    res.status(200).json({
        status: "success",
        documents: materials,
        materials,
        data: materials,
    });
});
exports.searchDocuments = (0, catchAsync_1.default)(async (req, res, next) => {
    const query = typeof req.query.q === "string" ? req.query.q.trim() : "";
    if (!query) {
        return next(new appError_1.default("Please provide a search term using ?q=.", 400));
    }
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(escaped, "i");
    const materials = (await material_model_1.default.find({
        approved: true,
        $or: [
            { title: regex },
            { courseCode: regex },
            { department: regex },
            { type: regex },
            { description: regex },
            { tags: regex },
        ],
    })
        .sort("-downloadCount -createdAt")
        .limit(20)
        .populate("uploadedBy", "name email role")).map(materialResponse_1.normalizeMaterial);
    res.status(200).json({
        status: "success",
        documents: materials,
        materials,
        results: materials,
        data: materials,
    });
});
