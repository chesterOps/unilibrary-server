import { Request, Response, NextFunction } from "express";
import Material from "../models/material.model";
import ViewHistory from "../models/viewHistory.model";
import AppError from "../utils/appError";
import catchAsync from "../utils/catchAsync";
import {
  generateEmbedding,
  buildEmbeddingText,
} from "../services/embedding.service";

export const uploadMaterial = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const {
      title,
      courseCode,
      department,
      level,
      academicSession,
      fileUrl,
      fileType,
      tags,
    } = req.body;

    const material = await Material.create({
      title,
      courseCode,
      department,
      level: Number(level),
      academicSession,
      fileUrl,
      fileType,
      uploadedBy: req.user!._id,
      tags: Array.isArray(tags) ? tags : [],
    });

    // Respond immediately — embedding is generated in the background so
    // the upload doesn't block on the OpenAI round-trip (~300–600 ms).
    // setImmediate defers until after the current I/O event, keeping the
    // event loop free. For production scale, replace with a job queue.
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

    res.status(201).json({
      status: "success",
      data: { material },
    });
  },
);

export const getMaterials = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const { department, level, courseCode, page = 1, limit = 20 } = req.query;

    const filter: Record<string, unknown> = {};
    if (department) filter.department = new RegExp(department as string, "i");
    if (level) filter.level = Number(level);
    if (courseCode) filter.courseCode = new RegExp(courseCode as string, "i");

    const skip = (Number(page) - 1) * Number(limit);

    const [materials, total] = await Promise.all([
      Material.find(filter)
        .skip(skip)
        .limit(Number(limit))
        .sort("-createdAt")
        .populate("uploadedBy", "name email role"),
      Material.countDocuments(filter),
    ]);

    res.status(200).json({
      status: "success",
      total,
      page: Number(page),
      length: materials.length,
      data: { materials },
    });
  },
);

// ── POST /api/v1/materials/:id/view ──────────────────────────────────────────
//
// Upserts a ViewHistory record so repeated views refresh the timestamp rather
// than flooding the collection. The { userId, materialId } compound index
// makes the upsert lookup O(log n).

export const logView = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const material = await Material.findById(req.params.id).select("_id");
    if (!material) {
      return next(new AppError("No material found with that ID.", 404));
    }

    await ViewHistory.findOneAndUpdate(
      { userId: req.user!._id, materialId: material._id },
      { $set: { viewedAt: new Date() } },
      { upsert: true },
    );

    res.status(200).json({ status: "success", message: "View logged." });
  },
);

export const getMaterial = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const material = await Material.findById(id).populate(
      "uploadedBy",
      "name email role",
    );

    if (!material) {
      return next(new AppError("No material found with that ID.", 404));
    }

    res.status(200).json({
      status: "success",
      data: { material },
    });
  },
);
