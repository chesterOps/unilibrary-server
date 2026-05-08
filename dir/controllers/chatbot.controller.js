"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.chatWithLibrary = void 0;
const material_model_1 = __importDefault(require("../models/material.model"));
const catchAsync_1 = __importDefault(require("../utils/catchAsync"));
const appError_1 = __importDefault(require("../utils/appError"));
const materialResponse_1 = require("../utils/materialResponse");
function buildChatReply(message, count) {
    const lower = message.toLowerCase();
    if (lower.includes("past question")) {
        return `I found ${count} material(s) that look useful for past question practice.`;
    }
    if (lower.includes("gst")) {
        return `Here are ${count} GST-related material(s) from the library.`;
    }
    if (lower.includes("machine learning")) {
        return `I found ${count} machine learning material(s) you can open right away.`;
    }
    if (lower.includes("linear algebra") || lower.includes("mth")) {
        return `I found ${count} mathematics material(s) related to your request.`;
    }
    if (lower.includes("computer science") || lower.includes("csc")) {
        return `I found ${count} computer science material(s) that match your request.`;
    }
    return `I found ${count} material(s) that may help with your request.`;
}
exports.chatWithLibrary = (0, catchAsync_1.default)(async (req, res, next) => {
    const { message } = req.body;
    if (!message || !message.trim()) {
        return next(new appError_1.default("Please provide a chatbot message.", 400));
    }
    const escaped = message.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(escaped.split(/\s+/).join("|"), "i");
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
        .limit(5)
        .populate("uploadedBy", "name email role")).map(materialResponse_1.normalizeMaterial);
    res.status(200).json({
        status: "success",
        reply: buildChatReply(message, materials.length),
        materials,
        data: { reply: buildChatReply(message, materials.length), materials },
    });
});
