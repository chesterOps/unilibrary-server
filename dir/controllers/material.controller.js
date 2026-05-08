"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMaterialRecommendations = exports.deleteMaterial = exports.getMaterial = exports.logView = exports.getMyUploads = exports.getMaterials = exports.uploadMaterial = void 0;
const material_model_1 = __importDefault(require("../models/material.model"));
const viewHistory_model_1 = __importDefault(require("../models/viewHistory.model"));
const appError_1 = __importDefault(require("../utils/appError"));
const catchAsync_1 = __importDefault(require("../utils/catchAsync"));
const embedding_service_1 = require("../services/embedding.service");
const materialResponse_1 = require("../utils/materialResponse");
const similarity_1 = require("../utils/similarity");
function parseTags(tags) {
    if (Array.isArray(tags))
        return tags.map(String);
    if (typeof tags === "string") {
        return tags
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean);
    }
    return [];
}
async function maybeGenerateEmbedding(material) {
    setImmediate(async () => {
        try {
            const text = (0, embedding_service_1.buildEmbeddingText)(material.title, material.courseCode, material.department, material.level, material.tags);
            const embedding = await (0, embedding_service_1.generateEmbedding)(text);
            await material_model_1.default.findByIdAndUpdate(material._id, { embedding });
            console.log(`[Embedding] Stored for material ${material._id}`);
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            console.warn(`[Embedding] Failed for material ${material._id}: ${msg}`);
        }
    });
}
exports.uploadMaterial = (0, catchAsync_1.default)(async (req, res, _next) => {
    const { legacyId, title, courseCode, department, type, description, level, academicSession, year, session, fileUrl, fileType, fileName, tags, } = req.body;
    const material = await material_model_1.default.create({
        legacyId,
        title,
        courseCode,
        department,
        type: type || "General",
        description: description || "",
        level: Number(level),
        academicSession: academicSession || year || session || "2025",
        fileUrl,
        fileType: fileType || "pdf",
        fileName: fileName ||
            (typeof fileUrl === "string" ? fileUrl.split("/").pop() : "") ||
            "",
        uploadedBy: req.user._id,
        tags: parseTags(tags),
        approved: false,
    });
    await maybeGenerateEmbedding(material);
    res.status(201).json({
        status: "success",
        message: "Material uploaded successfully and is pending approval.",
        material: (0, materialResponse_1.normalizeMaterial)(material),
        data: { material: (0, materialResponse_1.normalizeMaterial)(material) },
    });
});
exports.getMaterials = (0, catchAsync_1.default)(async (req, res, _next) => {
    const { department, level, courseCode, academicSession, page = 1, limit, pageSize, } = req.query;
    const filter = {};
    filter.approved = true;
    if (department)
        filter.department = new RegExp(String(department), "i");
    if (level)
        filter.level = Number(level);
    if (courseCode)
        filter.courseCode = new RegExp(String(courseCode), "i");
    if (academicSession) {
        filter.academicSession = new RegExp(String(academicSession), "i");
    }
    const resolvedPage = Math.max(1, Number(page) || 1);
    const resolvedPageSize = Math.max(1, Number(pageSize || limit) || 10);
    const skip = (resolvedPage - 1) * resolvedPageSize;
    const [materials, total] = await Promise.all([
        material_model_1.default.find(filter)
            .skip(skip)
            .limit(resolvedPageSize)
            .sort("-createdAt")
            .populate("uploadedBy", "name email role"),
        material_model_1.default.countDocuments(filter),
    ]);
    const normalized = materials.map(materialResponse_1.normalizeMaterial);
    const totalPages = Math.max(1, Math.ceil(total / resolvedPageSize));
    res.status(200).json({
        status: "success",
        items: normalized,
        materials: normalized,
        total,
        totalPages,
        page: resolvedPage,
        pageSize: resolvedPageSize,
        data: { items: normalized, materials: normalized },
    });
});
exports.getMyUploads = (0, catchAsync_1.default)(async (req, res, _next) => {
    const materials = await material_model_1.default.find({ uploadedBy: req.user._id })
        .sort("-createdAt")
        .populate("uploadedBy", "name email role");
    const normalized = materials.map(materialResponse_1.normalizeMaterial);
    res.status(200).json({
        status: "success",
        items: normalized,
        materials: normalized,
        total: normalized.length,
        data: { items: normalized, materials: normalized },
    });
});
exports.logView = (0, catchAsync_1.default)(async (req, res, next) => {
    const material = await (0, materialResponse_1.findMaterialByIdentifier)(req.params.id);
    if (!material) {
        return next(new appError_1.default("No material found with that ID.", 404));
    }
    await viewHistory_model_1.default.findOneAndUpdate({ userId: req.user._id, materialId: material._id }, { $set: { viewedAt: new Date() } }, { upsert: true });
    material.viewCount = (material.viewCount ?? 0) + 1;
    await material.save();
    res.status(200).json({
        status: "success",
        message: "View logged.",
        success: true,
    });
});
exports.getMaterial = (0, catchAsync_1.default)(async (req, res, next) => {
    const material = await (0, materialResponse_1.findMaterialByIdentifier)(req.params.id);
    if (!material) {
        return next(new appError_1.default("No material found with that ID.", 404));
    }
    await material.populate("uploadedBy", "name email role");
    res.status(200).json({
        status: "success",
        material: (0, materialResponse_1.normalizeMaterial)(material),
        data: { material: (0, materialResponse_1.normalizeMaterial)(material) },
    });
});
exports.deleteMaterial = (0, catchAsync_1.default)(async (req, res, next) => {
    const material = await (0, materialResponse_1.findMaterialByIdentifier)(req.params.id);
    if (!material) {
        return next(new appError_1.default("No material found with that ID.", 404));
    }
    const materialOwnerId = typeof material.uploadedBy === "object" && "toString" in material.uploadedBy
        ? material.uploadedBy.toString()
        : String(material.uploadedBy);
    const requestUserId = req.user._id.toString();
    const isOwner = materialOwnerId === requestUserId;
    const isAdmin = req.user.role === "admin";
    if (!isOwner && !isAdmin) {
        return next(new appError_1.default("You are not allowed to delete this material.", 403));
    }
    await material.deleteOne();
    res.status(200).json({
        status: "success",
        message: "Material deleted successfully.",
    });
});
exports.getMaterialRecommendations = (0, catchAsync_1.default)(async (req, res, next) => {
    const material = await (0, materialResponse_1.findMaterialByIdentifier)(req.params.id);
    if (!material) {
        return next(new appError_1.default("No material found with that ID.", 404));
    }
    const candidates = await material_model_1.default.find({
        _id: { $ne: material._id },
        $or: [
            { department: material.department },
            { courseCode: new RegExp(material.courseCode.split(" ")[0], "i") },
            { tags: { $in: material.tags } },
        ],
    })
        .sort("-downloadCount -viewCount -createdAt")
        .limit(6)
        .populate("uploadedBy", "name email role");
    let normalized = candidates.map(materialResponse_1.normalizeMaterial);
    if (material.embedding?.length) {
        const withEmbeddings = await material_model_1.default.find({
            _id: { $in: candidates.map((item) => item._id) },
            "embedding.0": { $exists: true },
        }).select("+embedding");
        const scoreMap = new Map(withEmbeddings.map((item) => [
            item._id.toString(),
            (0, similarity_1.cosineSimilarity)(material.embedding, item.embedding),
        ]));
        normalized = normalized
            .map((item) => ({
            ...item,
            score: scoreMap.get(String(item._id)) ?? 0,
        }))
            .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
    }
    res.status(200).json({
        status: "success",
        materials: normalized,
        results: normalized,
        data: { materials: normalized, results: normalized },
    });
});
