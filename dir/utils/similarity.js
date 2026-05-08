"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.averageVectors = averageVectors;
exports.cosineSimilarity = cosineSimilarity;
/**
 * Averages an array of equal-length vectors into a single vector.
 * Used to collapse a user's view history into one "taste profile" embedding.
 * Vectors with a different dimension than the first are silently skipped so a
 * single bad embedding never breaks the whole recommendation pass.
 */
function averageVectors(vecs) {
    const valid = vecs.filter((v) => v.length > 0);
    if (valid.length === 0)
        return [];
    const dim = valid[0].length;
    const matching = valid.filter((v) => v.length === dim);
    if (matching.length === 0)
        return [];
    const sum = new Array(dim).fill(0);
    for (const vec of matching) {
        for (let i = 0; i < dim; i++) {
            sum[i] += vec[i];
        }
    }
    return sum.map((v) => v / matching.length);
}
/**
 * Cosine similarity between two equal-length vectors.
 *
 * Returns a value in [-1, 1]. For normalised OpenAI embeddings this is
 * effectively [0, 1] in practice. Returns 0 when either vector is all zeros
 * or the lengths differ.
 */
function cosineSimilarity(vecA, vecB) {
    if (vecA.length !== vecB.length || vecA.length === 0)
        return 0;
    let dot = 0;
    let magA = 0;
    let magB = 0;
    for (let i = 0; i < vecA.length; i++) {
        dot += vecA[i] * vecB[i];
        magA += vecA[i] * vecA[i];
        magB += vecB[i] * vecB[i];
    }
    const magnitude = Math.sqrt(magA) * Math.sqrt(magB);
    return magnitude === 0 ? 0 : dot / magnitude;
}
