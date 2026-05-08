"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.keywordSearch = exports.semanticSearch = void 0;
const material_model_1 = __importDefault(require("../models/material.model"));
const searchLog_model_1 = __importDefault(require("../models/searchLog.model"));
const appError_1 = __importDefault(require("../utils/appError"));
const catchAsync_1 = __importDefault(require("../utils/catchAsync"));
const embedding_service_1 = require("../services/embedding.service");
const similarity_1 = require("../utils/similarity");
const materialResponse_1 = require("../utils/materialResponse");
async function logSearch(req, query, resultsReturned) {
    await searchLog_model_1.default.create({
        userId: req.user?._id,
        query,
        resultsReturned,
    });
}
async function runKeywordLookup(query) {
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(escaped, "i");
    return material_model_1.default.find({
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
        .limit(20)
        .sort("-downloadCount -createdAt")
        .populate("uploadedBy", "name email role");
}
exports.semanticSearch = (0, catchAsync_1.default)(async (req, res, next) => {
    const { query } = req.body;
    if (!query || typeof query !== "string" || !query.trim()) {
        return next(new appError_1.default("Please provide a search query.", 400));
    }
    const cleanQuery = query.trim();
    try {
        const queryEmbedding = await (0, embedding_service_1.generateEmbedding)(cleanQuery);
        const materials = await material_model_1.default.find({
            "embedding.0": { $exists: true },
        })
            .select("+embedding")
            .populate("uploadedBy", "name email role");
        if (materials.length === 0) {
            const fallback = (await runKeywordLookup(cleanQuery)).map(materialResponse_1.normalizeMaterial);
            await logSearch(req, cleanQuery, fallback.length);
            res.status(200).json({
                status: "success",
                results: fallback,
                materials: fallback,
                data: fallback,
            });
            return;
        }
        const ranked = materials
            .map((m) => ({
            doc: m,
            score: (0, similarity_1.cosineSimilarity)(queryEmbedding, m.embedding),
        }))
            .sort((a, b) => b.score - a.score)
            .slice(0, 10)
            .map(({ doc, score }) => ({
            ...(0, materialResponse_1.normalizeMaterial)(doc),
            score: parseFloat(score.toFixed(4)),
        }));
        await logSearch(req, cleanQuery, ranked.length);
        res.status(200).json({
            status: "success",
            results: ranked,
            materials: ranked,
            data: ranked,
        });
    }
    catch (_error) {
        const fallback = (await runKeywordLookup(cleanQuery)).map(materialResponse_1.normalizeMaterial);
        await logSearch(req, cleanQuery, fallback.length);
        res.status(200).json({
            status: "success",
            results: fallback,
            materials: fallback,
            data: fallback,
        });
    }
});
exports.keywordSearch = (0, catchAsync_1.default)(async (req, res, next) => {
    const { q } = req.query;
    if (!q || typeof q !== "string" || !q.trim()) {
        return next(new appError_1.default("Please provide a search term using the ?q= parameter.", 400));
    }
    const cleanQ = q.trim();
    const materials = (await runKeywordLookup(cleanQ)).map(materialResponse_1.normalizeMaterial);
    await logSearch(req, cleanQ, materials.length);
    res.status(200).json({
        status: "success",
        results: materials,
        materials,
        length: materials.length,
        data: materials,
    });
});
