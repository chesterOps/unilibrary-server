"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateEmbedding = generateEmbedding;
exports.buildEmbeddingText = buildEmbeddingText;
const openai_1 = __importDefault(require("../config/openai"));
/**
 * Calls the OpenAI Embeddings API and returns the embedding vector.
 * Input is sliced to 8 000 chars — well within the 8 191-token API limit
 * for text-embedding-3-small even for verbose inputs.
 */
async function generateEmbedding(text) {
    const response = await openai_1.default.embeddings.create({
        model: process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-3-small",
        input: text.trim().slice(0, 8000),
    });
    return response.data[0].embedding;
}
/**
 * Builds the text that will be embedded for a material document.
 * Combines the most searchable fields into a single descriptive string.
 */
function buildEmbeddingText(title, courseCode, department, level, tags) {
    const parts = [title, courseCode, department, `${level} level`];
    if (tags.length > 0)
        parts.push(tags.join(" "));
    return parts.join(" ");
}
