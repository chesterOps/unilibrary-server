import { Request, Response, NextFunction } from "express";
import Material from "../models/material.model";
import AppError from "../utils/appError";
import catchAsync from "../utils/catchAsync";
import { normalizeMaterial } from "../utils/materialResponse";

export const getDocuments = catchAsync(
  async (_req: Request, res: Response, _next: NextFunction) => {
    const materials = (
      await Material.find({ approved: true })
        .sort("-createdAt")
        .populate("uploadedBy", "name email role")
    ).map(normalizeMaterial);

    res.status(200).json({
      status: "success",
      documents: materials,
      materials,
      data: materials,
    });
  },
);

export const searchDocuments = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const query = typeof req.query.q === "string" ? req.query.q.trim() : "";
    if (!query) {
      return next(new AppError("Please provide a search term using ?q=.", 400));
    }

    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(escaped, "i");

    const materials = (
      await Material.find({
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
        .limit(20)
        .populate("uploadedBy", "name email role")
    ).map(normalizeMaterial);

    res.status(200).json({
      status: "success",
      documents: materials,
      materials,
      results: materials,
      data: materials,
    });
  },
);
