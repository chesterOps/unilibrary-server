import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import Material from "../models/material.model";
import ViewHistory from "../models/viewHistory.model";
import catchAsync from "../utils/catchAsync";
import { cosineSimilarity, averageVectors } from "../utils/similarity";

// ── Shared helper ─────────────────────────────────────────────────────────────

const POPULATE_UPLOADER = { path: "uploadedBy", select: "name email role" };

async function popularInDepartment(department: string, limit: number) {
  return Material.find({ department })
    .sort("-downloadCount -createdAt")
    .limit(limit)
    .populate(POPULATE_UPLOADER);
}

// Strip the embedding array before JSON serialisation.
// 1 536 floats (~12 KB) per document is wasteful for clients that only need
// the score for display ordering.
function stripEmbedding(
  doc: InstanceType<typeof Material>,
  score: number,
): Record<string, unknown> {
  const obj = doc.toObject() as unknown as Record<string, unknown>;
  delete obj.embedding;
  return { ...obj, score: parseFloat(score.toFixed(4)) };
}

// ── GET /api/v1/recommendations ───────────────────────────────────────────────
//
// Personalised recommendations for the authenticated student.
//
// Algorithm
//   1. Pull the 5 most recently viewed materials from ViewHistory.
//   2. Load their embeddings from the Material collection.
//   3. Average those embeddings into a single "taste profile" vector.
//   4. Score every other embedded material by cosine similarity to the profile.
//   5. Return the top 6, excluding anything already viewed.
//
// Fallbacks (in order)
//   A. No view history at all     → top 6 most downloaded in user's department
//   B. History exists but no
//      embeddings generated yet   → same fallback as A
//
// Scalability note: loading all embeddings into Node.js is fine up to ~50 000
// materials. Beyond that, replace steps 3–5 with a MongoDB Atlas Vector Search
// $vectorSearch aggregation pipeline.

export const getRecommendations = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const user = req.user!;
    const userId = user._id as mongoose.Types.ObjectId;

    // 1. Recent view history (most recent first)
    const history = await ViewHistory.find({ userId })
      .sort({ viewedAt: -1 })
      .limit(5)
      .lean();

    // ── Fallback A: no history ────────────────────────────────────────────
    if (history.length === 0) {
      const popular = await popularInDepartment(user.department, 6);
      res.status(200).json({
        status: "success",
        source: "popular_no_history",
        length: popular.length,
        data: popular,
      });
      return;
    }

    const viewedIds = history.map((h) => h.materialId);

    // 2. Load embeddings of the viewed materials
    const viewedWithEmbeddings = await Material.find({
      _id: { $in: viewedIds },
      "embedding.0": { $exists: true },
    }).select("+embedding");

    // ── Fallback B: history exists but embeddings not yet ready ───────────
    if (viewedWithEmbeddings.length === 0) {
      const popular = await popularInDepartment(user.department, 6);
      res.status(200).json({
        status: "success",
        source: "popular_no_embeddings",
        length: popular.length,
        data: popular,
      });
      return;
    }

    // 3. Build one profile vector by averaging the viewed embeddings
    const profileVector = averageVectors(
      viewedWithEmbeddings.map((m) => m.embedding),
    );

    // 4. Fetch candidates — embedded materials the user has NOT yet viewed
    const candidates = await Material.find({
      _id: { $nin: viewedIds },
      "embedding.0": { $exists: true },
    })
      .select("+embedding")
      .populate(POPULATE_UPLOADER);

    // 5. Rank by cosine similarity, take top 6
    const results = candidates
      .map((m) => ({ doc: m, score: cosineSimilarity(profileVector, m.embedding) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 6)
      .map(({ doc, score }) => stripEmbedding(doc, score));

    res.status(200).json({
      status: "success",
      source: "personalized",
      length: results.length,
      data: results,
    });
  },
);

// ── GET /api/v1/recommendations/popular ──────────────────────────────────────
//
// Public. Returns two datasets in one response:
//
//   overall      — top 10 most downloaded materials across the whole library
//   byDepartment — when ?department=X: top 10 for that department
//                  otherwise: aggregated download totals per department,
//                  sorted by total downloads (useful for a leaderboard)

export const getPopular = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const department =
      typeof req.query.department === "string"
        ? req.query.department.trim()
        : "";

    const [overall, byDepartment] = await Promise.all([
      Material.find()
        .sort("-downloadCount -createdAt")
        .limit(10)
        .populate(POPULATE_UPLOADER),

      department
        ? Material.find({ department: new RegExp(department, "i") })
            .sort("-downloadCount -createdAt")
            .limit(10)
            .populate(POPULATE_UPLOADER)
        : Material.aggregate([
            {
              $group: {
                _id: "$department",
                totalDownloads: { $sum: "$downloadCount" },
                materialCount: { $sum: 1 },
              },
            },
            { $sort: { totalDownloads: -1 } },
            {
              $project: {
                _id: 0,
                department: "$_id",
                totalDownloads: 1,
                materialCount: 1,
              },
            },
          ]),
    ]);

    res.status(200).json({
      status: "success",
      data: { overall, byDepartment },
    });
  },
);
