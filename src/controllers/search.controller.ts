import { Request, Response, NextFunction } from "express";
import Material from "../models/material.model";
import SearchLog from "../models/searchLog.model";
import AppError from "../utils/appError";
import catchAsync from "../utils/catchAsync";
import { generateEmbedding } from "../services/embedding.service";
import { cosineSimilarity } from "../utils/similarity";

// ── Semantic search ───────────────────────────────────────────────────────────
//
// Flow: embed query → fetch all embedded materials → cosine rank → top 10
//
// Scalability note: fetching all embeddings into memory works well up to
// ~50 000 documents. Beyond that, switch to MongoDB Atlas Vector Search
// ($vectorSearch aggregation stage) which does the ANN lookup server-side.

export const semanticSearch = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { query } = req.body;

    if (!query || typeof query !== "string" || !query.trim()) {
      return next(new AppError("Please provide a search query.", 400));
    }

    const cleanQuery = query.trim();

    // Embed the query using the same model used at upload time
    const queryEmbedding = await generateEmbedding(cleanQuery);

    // { "embedding.0": { $exists: true } } efficiently filters out materials
    // that were saved before embeddings were generated (empty array default).
    // embedding has select:false — must opt in explicitly.
    const materials = await Material.find({
      "embedding.0": { $exists: true },
    }).select("+embedding");

    if (materials.length === 0) {
      await SearchLog.create({
        userId: req.user?._id,
        query: cleanQuery,
        resultsReturned: 0,
      });
      res.status(200).json({ status: "success", length: 0, data: [] });
      return;
    }

    // Score every material, sort descending, take top 10
    const ranked = materials
      .map((m) => ({
        doc: m,
        score: cosineSimilarity(queryEmbedding, m.embedding),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    // Strip the embedding array before sending — clients have no use for
    // 1 536 floats and it would bloat every response by ~12 KB per item.
    const results = ranked.map(({ doc, score }) => {
      const obj = doc.toObject() as unknown as Record<string, unknown>;
      delete obj.embedding;
      return { ...obj, score: parseFloat(score.toFixed(4)) };
    });

    await SearchLog.create({
      userId: req.user?._id,
      query: cleanQuery,
      resultsReturned: results.length,
    });

    res.status(200).json({
      status: "success",
      length: results.length,
      data: results,
    });
  },
);

// ── Keyword fallback search ───────────────────────────────────────────────────
//
// GET /api/v1/search?q=<term>
//
// Uses $regex for partial, case-insensitive matching across title, courseCode,
// department, and tags. Does not require an embedding to exist on the document.
// Useful for exact/partial course code lookups ("CSC", "MTH301") or when
// the OpenAI API is unavailable.

export const keywordSearch = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { q } = req.query;

    if (!q || typeof q !== "string" || !q.trim()) {
      return next(
        new AppError(
          "Please provide a search term using the ?q= parameter.",
          400,
        ),
      );
    }

    const cleanQ = q.trim();

    // Escape regex special characters so user input like "CSC301+" doesn't throw
    const escaped = cleanQ.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(escaped, "i");

    const materials = await Material.find({
      $or: [
        { title: regex },
        { courseCode: regex },
        { department: regex },
        { tags: regex }, // MongoDB applies regex to each element of the array
      ],
    })
      .limit(20)
      .sort("-createdAt")
      .populate("uploadedBy", "name email role");

    await SearchLog.create({
      userId: req.user?._id,
      query: cleanQ,
      resultsReturned: materials.length,
    });

    res.status(200).json({
      status: "success",
      length: materials.length,
      data: materials,
    });
  },
);
