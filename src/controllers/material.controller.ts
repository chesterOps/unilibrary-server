import { Request, Response, NextFunction } from "express";
import Material from "../models/material.model";
import ViewHistory from "../models/viewHistory.model";
import AppError from "../utils/appError";
import catchAsync from "../utils/catchAsync";
import {
  generateEmbedding,
  buildEmbeddingText,
} from "../services/embedding.service";
import { findMaterialByIdentifier, normalizeMaterial } from "../utils/materialResponse";
import { cosineSimilarity } from "../utils/similarity";

function parseTags(tags: unknown): string[] {
  if (Array.isArray(tags)) return tags.map(String);
  if (typeof tags === "string") {
    return tags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);
  }
  return [];
}

async function maybeGenerateEmbedding(material: any) {
  setImmediate(async () => {
    try {
      const text = buildEmbeddingText(
        material.title,
        material.courseCode,
        material.department,
        material.level,
        material.tags,
      );
      const embedding = await generateEmbedding(text);
      await Material.findByIdAndUpdate(material._id, { embedding });
      console.log(`[Embedding] Stored for material ${material._id}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[Embedding] Failed for material ${material._id}: ${msg}`);
    }
  });
}

export const uploadMaterial = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const {
      legacyId,
      title,
      courseCode,
      department,
      type,
      description,
      level,
      academicSession,
      year,
      session,
      fileUrl,
      fileType,
      fileName,
      tags,
    } = req.body;

    const material = await Material.create({
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
      fileName:
        fileName ||
        (typeof fileUrl === "string" ? fileUrl.split("/").pop() : "") ||
        "",
      uploadedBy: req.user!._id,
      tags: parseTags(tags),
      approved: false,
    });

    await maybeGenerateEmbedding(material);

    res.status(201).json({
      status: "success",
      message: "Material uploaded successfully and is pending approval.",
      material: normalizeMaterial(material),
      data: { material: normalizeMaterial(material) },
    });
  },
);

export const getMaterials = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const {
      department,
      level,
      courseCode,
      academicSession,
      page = 1,
      limit,
      pageSize,
    } = req.query;

    const filter: Record<string, unknown> = {};
    filter.approved = true;
    if (department) filter.department = new RegExp(String(department), "i");
    if (level) filter.level = Number(level);
    if (courseCode) filter.courseCode = new RegExp(String(courseCode), "i");
    if (academicSession) {
      filter.academicSession = new RegExp(String(academicSession), "i");
    }

    const resolvedPage = Math.max(1, Number(page) || 1);
    const resolvedPageSize = Math.max(1, Number(pageSize || limit) || 10);
    const skip = (resolvedPage - 1) * resolvedPageSize;

    const [materials, total] = await Promise.all([
      Material.find(filter)
        .skip(skip)
        .limit(resolvedPageSize)
        .sort("-createdAt")
        .populate("uploadedBy", "name email role"),
      Material.countDocuments(filter),
    ]);

    const normalized = materials.map(normalizeMaterial);
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
  },
);

export const getMyUploads = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const materials = await Material.find({ uploadedBy: req.user!._id })
      .sort("-createdAt")
      .populate("uploadedBy", "name email role");

    const normalized = materials.map(normalizeMaterial);

    res.status(200).json({
      status: "success",
      items: normalized,
      materials: normalized,
      total: normalized.length,
      data: { items: normalized, materials: normalized },
    });
  },
);

export const logView = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const material = await findMaterialByIdentifier(req.params.id);
    if (!material) {
      return next(new AppError("No material found with that ID.", 404));
    }

    await ViewHistory.findOneAndUpdate(
      { userId: req.user!._id, materialId: material._id },
      { $set: { viewedAt: new Date() } },
      { upsert: true },
    );

    material.viewCount = (material.viewCount ?? 0) + 1;
    await material.save();

    res.status(200).json({
      status: "success",
      message: "View logged.",
      success: true,
    });
  },
);

export const logDownload = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const material = await findMaterialByIdentifier(req.params.id);
    if (!material) {
      return next(new AppError("No material found with that ID.", 404));
    }

    material.downloadCount = (material.downloadCount ?? 0) + 1;
    await material.save();

    res.status(200).json({
      status: "success",
      message: "Download logged.",
      success: true,
      material: normalizeMaterial(material),
      data: { material: normalizeMaterial(material) },
    });
  },
);

export const getMaterial = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const material = await findMaterialByIdentifier(req.params.id);

    if (!material) {
      return next(new AppError("No material found with that ID.", 404));
    }

    await material.populate("uploadedBy", "name email role");

    res.status(200).json({
      status: "success",
      material: normalizeMaterial(material),
      data: { material: normalizeMaterial(material) },
    });
  },
);

export const deleteMaterial = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const material = await findMaterialByIdentifier(req.params.id);

    if (!material) {
      return next(new AppError("No material found with that ID.", 404));
    }

    const materialOwnerId =
      typeof material.uploadedBy === "object" && "toString" in (material.uploadedBy as any)
        ? (material.uploadedBy as any).toString()
        : String(material.uploadedBy);
    const requestUserId = (req.user!._id as any).toString();
    const isOwner = materialOwnerId === requestUserId;
    const isAdmin = req.user!.role === "admin";
    if (!isOwner && !isAdmin) {
      return next(new AppError("You are not allowed to delete this material.", 403));
    }

    await material.deleteOne();

    res.status(200).json({
      status: "success",
      message: "Material deleted successfully.",
    });
  },
);

export const getMaterialRecommendations = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const material = await findMaterialByIdentifier(req.params.id);

    if (!material) {
      return next(new AppError("No material found with that ID.", 404));
    }

    const candidates = await Material.find({
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

    let normalized = candidates.map(normalizeMaterial);

    if (material.embedding?.length) {
      const withEmbeddings = await Material.find({
        _id: { $in: candidates.map((item) => item._id) },
        "embedding.0": { $exists: true },
      }).select("+embedding");

      const scoreMap = new Map(
        withEmbeddings.map((item) => [
          (item._id as any).toString(),
          cosineSimilarity(material.embedding, item.embedding),
        ]),
      );

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
  },
);
