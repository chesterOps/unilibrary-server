"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeMaterial = normalizeMaterial;
exports.findMaterialByIdentifier = findMaterialByIdentifier;
const mongoose_1 = require("mongoose");
const material_model_1 = __importDefault(require("../models/material.model"));
function asPlain(material) {
    if (!material)
        return {};
    return typeof material.toObject === "function" ? material.toObject() : material;
}
function normalizeMaterial(material) {
    const item = asPlain(material);
    const uploader = item.uploadedBy && typeof item.uploadedBy === "object"
        ? item.uploadedBy
        : null;
    return {
        ...item,
        id: item.legacyId || item._id?.toString?.() || item._id,
        _id: item._id,
        title: item.title,
        courseCode: item.courseCode,
        department: item.department,
        type: item.type || "General",
        description: item.description || "",
        level: item.level,
        academicSession: item.academicSession,
        year: item.academicSession,
        session: item.academicSession,
        uploadedBy: uploader || item.uploadedBy,
        lecturerName: uploader?.name || item.lecturerName || null,
        downloads: item.downloadCount ?? 0,
        downloadCount: item.downloadCount ?? 0,
        views: item.viewCount ?? 0,
        viewCount: item.viewCount ?? 0,
        fileUrl: item.fileUrl,
        fileName: item.fileName ||
            (item.fileUrl ? item.fileUrl.split("/").pop() : "") ||
            `${item.slug || "material"}.${item.fileType || "pdf"}`,
        status: item.approved ? "Approved" : "Pending",
        tags: Array.isArray(item.tags) ? item.tags : [],
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
    };
}
async function findMaterialByIdentifier(id) {
    if ((0, mongoose_1.isValidObjectId)(id)) {
        const byObjectId = await material_model_1.default.findById(id);
        if (byObjectId)
            return byObjectId;
    }
    return material_model_1.default.findOne({ $or: [{ legacyId: id }, { slug: id }] });
}
