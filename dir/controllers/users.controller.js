"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getHistory = exports.getUserStats = exports.getLecturerStats = void 0;
const material_model_1 = __importDefault(require("../models/material.model"));
const viewHistory_model_1 = __importDefault(require("../models/viewHistory.model"));
const catchAsync_1 = __importDefault(require("../utils/catchAsync"));
exports.getLecturerStats = (0, catchAsync_1.default)(async (req, res, _next) => {
    const [totalUploads, pendingApproval, downloadsAgg] = await Promise.all([
        material_model_1.default.countDocuments({ uploadedBy: req.user._id }),
        material_model_1.default.countDocuments({ uploadedBy: req.user._id, approved: false }),
        material_model_1.default.aggregate([
            { $match: { uploadedBy: req.user._id } },
            { $group: { _id: null, totalDownloads: { $sum: "$downloadCount" } } },
        ]),
    ]);
    res.status(200).json({
        status: "success",
        totalUploads,
        totalDownloads: downloadsAgg[0]?.totalDownloads ?? 0,
        pendingApproval,
        data: {
            totalUploads,
            totalDownloads: downloadsAgg[0]?.totalDownloads ?? 0,
            pendingApproval,
        },
    });
});
exports.getUserStats = (0, catchAsync_1.default)(async (req, res, _next) => {
    const [totalMaterials, myViewed] = await Promise.all([
        material_model_1.default.countDocuments({ approved: true }),
        viewHistory_model_1.default.countDocuments({ userId: req.user._id }),
    ]);
    res.status(200).json({
        status: "success",
        totalMaterials,
        myDownloads: myViewed,
        myViewed,
        data: {
            totalMaterials,
            myDownloads: myViewed,
            myViewed,
        },
    });
});
exports.getHistory = (0, catchAsync_1.default)(async (req, res, _next) => {
    const history = await viewHistory_model_1.default.find({ userId: req.user._id })
        .sort({ viewedAt: -1 })
        .populate("materialId", "legacyId title courseCode department");
    const items = history
        .filter((entry) => entry.materialId)
        .map((entry) => ({
        materialId: entry.materialId.legacyId || entry.materialId._id,
        title: entry.materialId.title,
        courseCode: entry.materialId.courseCode,
        department: entry.materialId.department,
        viewedAt: entry.viewedAt,
    }));
    res.status(200).json({
        status: "success",
        history: items,
        data: items,
    });
});
