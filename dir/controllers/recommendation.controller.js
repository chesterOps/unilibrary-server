"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLegacyRoleRecommendations = exports.getPopular = exports.getRecommendations = void 0;
const material_model_1 = __importDefault(require("../models/material.model"));
const viewHistory_model_1 = __importDefault(require("../models/viewHistory.model"));
const catchAsync_1 = __importDefault(require("../utils/catchAsync"));
const similarity_1 = require("../utils/similarity");
const materialResponse_1 = require("../utils/materialResponse");
const POPULATE_UPLOADER = { path: "uploadedBy", select: "name email role" };
async function popularInDepartment(department, limit) {
    return material_model_1.default.find({ department })
        .sort("-downloadCount -createdAt")
        .limit(limit)
        .populate(POPULATE_UPLOADER);
}
async function getPersonalizedForUser(user) {
    const userId = user._id;
    // Parallel: Fetch history and populate uploader data in one go
    const [history, uploaderMap] = await Promise.all([
        viewHistory_model_1.default.find({ userId }).sort({ viewedAt: -1 }).limit(5).lean(),
        material_model_1.default.find().select("uploadedBy").populate(POPULATE_UPLOADER).lean().then((docs) => new Map(docs.map((d) => [d._id.toString(), d.uploadedBy]))),
    ]);
    if (history.length === 0) {
        const popular = await popularInDepartment(user.department, 6);
        return {
            source: "popular_no_history",
            data: popular.map(materialResponse_1.normalizeMaterial),
        };
    }
    const viewedIds = history.map((h) => h.materialId.toString());
    // Fetch viewed items with embeddings in bulk (single query)
    const viewedWithEmbeddings = await material_model_1.default.find({
        _id: { $in: viewedIds },
        embedding: { $exists: true, $ne: [] },
    })
        .select("+embedding")
        .lean();
    if (viewedWithEmbeddings.length === 0) {
        const popular = await popularInDepartment(user.department, 6);
        return {
            source: "popular_no_embeddings",
            data: popular.map(materialResponse_1.normalizeMaterial),
        };
    }
    // Calculate profile vector once
    const profileVector = (0, similarity_1.averageVectors)(viewedWithEmbeddings.map((m) => m.embedding));
    // Fetch candidates (6+ limit to pre-filter before sorting)
    const candidates = await material_model_1.default.find({
        _id: { $nin: viewedIds },
        embedding: { $exists: true, $ne: [] },
        approved: true,
    })
        .select("+embedding -embedding")
        .populate(POPULATE_UPLOADER)
        .limit(50) // Fetch top 50 then calculate similarity
        .lean();
    // Calculate similarity and return top 6
    const results = candidates
        .map((m) => ({
        doc: m,
        score: (0, similarity_1.cosineSimilarity)(profileVector, m.embedding),
    }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 6)
        .map(({ doc, score }) => ({
        ...(0, materialResponse_1.normalizeMaterial)(doc),
        score: parseFloat(score.toFixed(4)),
    }));
    return {
        source: "personalized",
        data: results,
    };
}
exports.getRecommendations = (0, catchAsync_1.default)(async (req, res, _next) => {
    if (req.user && req.user.role === "student") {
        const personalized = await getPersonalizedForUser(req.user);
        res.status(200).json({
            status: "success",
            source: personalized.source,
            materials: personalized.data,
            results: personalized.data,
            length: personalized.data.length,
            data: personalized.data,
        });
        return;
    }
    const materials = (await material_model_1.default.find({ approved: true })
        .sort("-downloadCount -viewCount -createdAt")
        .limit(6)
        .populate(POPULATE_UPLOADER)).map(materialResponse_1.normalizeMaterial);
    res.status(200).json({
        status: "success",
        source: "general",
        materials,
        results: materials,
        length: materials.length,
        data: materials,
    });
});
exports.getPopular = (0, catchAsync_1.default)(async (req, res, _next) => {
    const department = typeof req.query.department === "string" ? req.query.department.trim() : "";
    const query = department
        ? { department: new RegExp(department, "i"), approved: true }
        : { approved: true };
    const materials = (await material_model_1.default.find(query)
        .sort("-downloadCount -viewCount -createdAt")
        .limit(10)
        .populate(POPULATE_UPLOADER)).map(materialResponse_1.normalizeMaterial);
    res.status(200).json({
        status: "success",
        materials,
        results: materials,
        data: materials,
    });
});
exports.getLegacyRoleRecommendations = (0, catchAsync_1.default)(async (req, res, _next) => {
    const role = typeof req.query.role === "string" ? req.query.role : "student";
    let query = { approved: true };
    if (role === "admin") {
        query = { approved: false };
    }
    const materials = (await material_model_1.default.find(query)
        .sort(role === "admin" ? "-createdAt" : "-downloadCount -createdAt")
        .limit(8)
        .populate(POPULATE_UPLOADER)).map(materialResponse_1.normalizeMaterial);
    res.status(200).json({
        status: "success",
        role,
        materials,
        results: materials,
        data: materials,
    });
});
