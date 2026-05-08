import { Request, Response, NextFunction } from "express";
import Material from "../models/material.model";
import SearchLog from "../models/searchLog.model";
import AppError from "../utils/appError";
import catchAsync from "../utils/catchAsync";
import { generateEmbedding } from "../services/embedding.service";
import { cosineSimilarity } from "../utils/similarity";
import { normalizeMaterial } from "../utils/materialResponse";

async function logSearch(req: Request, query: string, resultsReturned: number) {
  await SearchLog.create({
    userId: req.user?._id,
    query,
    resultsReturned,
  });
}

async function runKeywordLookup(query: string) {
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(escaped, "i");

  return Material.find({
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

export const semanticSearch = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { query } = req.body;

    if (!query || typeof query !== "string" || !query.trim()) {
      return next(new AppError("Please provide a search query.", 400));
    }

    const cleanQuery = query.trim();

    try {
      const queryEmbedding = await generateEmbedding(cleanQuery);
      const materials = await Material.find({
        "embedding.0": { $exists: true },
      })
        .select("+embedding")
        .populate("uploadedBy", "name email role");

      if (materials.length === 0) {
        const fallback = (await runKeywordLookup(cleanQuery)).map(normalizeMaterial);
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
          score: cosineSimilarity(queryEmbedding, m.embedding),
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 10)
        .map(({ doc, score }) => ({
          ...normalizeMaterial(doc),
          score: parseFloat(score.toFixed(4)),
        }));

      await logSearch(req, cleanQuery, ranked.length);

      res.status(200).json({
        status: "success",
        results: ranked,
        materials: ranked,
        data: ranked,
      });
    } catch (_error) {
      const fallback = (await runKeywordLookup(cleanQuery)).map(normalizeMaterial);
      await logSearch(req, cleanQuery, fallback.length);
      res.status(200).json({
        status: "success",
        results: fallback,
        materials: fallback,
        data: fallback,
      });
    }
  },
);

export const keywordSearch = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { q } = req.query;

    if (!q || typeof q !== "string" || !q.trim()) {
      return next(
        new AppError("Please provide a search term using the ?q= parameter.", 400),
      );
    }

    const cleanQ = q.trim();
    const materials = (await runKeywordLookup(cleanQ)).map(normalizeMaterial);
    await logSearch(req, cleanQ, materials.length);

    res.status(200).json({
      status: "success",
      results: materials,
      materials,
      length: materials.length,
      data: materials,
    });
  },
);
