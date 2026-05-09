import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import Material from "../models/material.model";
import ViewHistory from "../models/viewHistory.model";
import catchAsync from "../utils/catchAsync";
import { cosineSimilarity, averageVectors } from "../utils/similarity";
import { normalizeMaterial } from "../utils/materialResponse";

const POPULATE_UPLOADER = { path: "uploadedBy", select: "name email role" };

async function popularInDepartment(department: string, limit: number) {
  return Material.find({ department })
    .sort("-downloadCount -createdAt")
    .limit(limit)
    .populate(POPULATE_UPLOADER);
}

async function getPersonalizedForUser(user: any) {
  const userId = user._id as mongoose.Types.ObjectId;

  // Parallel: Fetch history and populate uploader data in one go
  const [history, uploaderMap] = await Promise.all([
    ViewHistory.find({ userId }).sort({ viewedAt: -1 }).limit(5).lean(),
    Material.find()
      .select("uploadedBy")
      .populate(POPULATE_UPLOADER)
      .lean()
      .then(
        (docs) =>
          new Map(docs.map((d: any) => [d._id.toString(), d.uploadedBy])),
      ),
  ]);

  if (history.length === 0) {
    const popular = await popularInDepartment(user.department, 6);
    return {
      source: "popular_no_history",
      data: popular.map(normalizeMaterial),
    };
  }

  const viewedIds = history.map((h) => h.materialId.toString());

  // Fetch viewed items with embeddings in bulk (single query)
  const viewedWithEmbeddings = await Material.find({
    _id: { $in: viewedIds },
    embedding: { $exists: true, $ne: [] },
  })
    .select("+embedding")
    .lean();

  if (viewedWithEmbeddings.length === 0) {
    const popular = await popularInDepartment(user.department, 6);
    return {
      source: "popular_no_embeddings",
      data: popular.map(normalizeMaterial),
    };
  }

  // Calculate profile vector once
  const profileVector = averageVectors(
    viewedWithEmbeddings.map((m: any) => m.embedding),
  );

  // Fetch candidates (6+ limit to pre-filter before sorting)
  const candidates = await Material.find({
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
    .map((m: any) => ({
      doc: m,
      score: cosineSimilarity(profileVector, m.embedding),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 6)
    .map(({ doc, score }) => ({
      ...normalizeMaterial(doc),
      score: parseFloat(score.toFixed(4)),
    }));

  return {
    source: "personalized",
    data: results,
  };
}

export const getRecommendations = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
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

    const materials = (
      await Material.find({ approved: true })
        .sort("-downloadCount -viewCount -createdAt")
        .limit(6)
        .populate(POPULATE_UPLOADER)
    ).map(normalizeMaterial);

    res.status(200).json({
      status: "success",
      source: "general",
      materials,
      results: materials,
      length: materials.length,
      data: materials,
    });
  },
);

export const getPopular = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const department =
      typeof req.query.department === "string"
        ? req.query.department.trim()
        : "";

    const query = department
      ? { department: new RegExp(department, "i"), approved: true }
      : { approved: true };

    const materials = (
      await Material.find(query)
        .sort("-downloadCount -viewCount -createdAt")
        .limit(10)
        .populate(POPULATE_UPLOADER)
    ).map(normalizeMaterial);

    res.status(200).json({
      status: "success",
      materials,
      results: materials,
      data: materials,
    });
  },
);

export const getLegacyRoleRecommendations = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const role =
      typeof req.query.role === "string" ? req.query.role : "student";

    let query: Record<string, unknown> = { approved: true };
    if (role === "admin") {
      query = { approved: false };
    }

    const materials = (
      await Material.find(query)
        .sort(role === "admin" ? "-createdAt" : "-downloadCount -createdAt")
        .limit(8)
        .populate(POPULATE_UPLOADER)
    ).map(normalizeMaterial);

    res.status(200).json({
      status: "success",
      role,
      materials,
      results: materials,
      data: materials,
    });
  },
);
