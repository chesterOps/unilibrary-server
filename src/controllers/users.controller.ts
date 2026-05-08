import { Request, Response, NextFunction } from "express";
import Material from "../models/material.model";
import ViewHistory from "../models/viewHistory.model";
import catchAsync from "../utils/catchAsync";

export const getLecturerStats = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const [totalUploads, pendingApproval, downloadsAgg] = await Promise.all([
      Material.countDocuments({ uploadedBy: req.user!._id }),
      Material.countDocuments({ uploadedBy: req.user!._id, approved: false }),
      Material.aggregate([
        { $match: { uploadedBy: req.user!._id } },
        { $group: { _id: null, totalDownloads: { $sum: "$downloadCount" } } },
      ]),
    ]);

    res.status(200).json({
      status: "success",
      totalUploads,
      totalDownloads: downloadsAgg[0]?.totalDownloads ?? 0,
      pendingApproval,
      data: {
        totalUploads,
        totalDownloads: downloadsAgg[0]?.totalDownloads ?? 0,
        pendingApproval,
      },
    });
  },
);

export const getUserStats = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const [totalMaterials, myViewed] = await Promise.all([
      Material.countDocuments({ approved: true }),
      ViewHistory.countDocuments({ userId: req.user!._id }),
    ]);

    res.status(200).json({
      status: "success",
      totalMaterials,
      myDownloads: myViewed,
      myViewed,
      data: {
        totalMaterials,
        myDownloads: myViewed,
        myViewed,
      },
    });
  },
);

export const getHistory = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const history = await ViewHistory.find({ userId: req.user!._id })
      .sort({ viewedAt: -1 })
      .populate("materialId", "legacyId title courseCode department");

    const items = history
      .filter((entry: any) => entry.materialId)
      .map((entry: any) => ({
        materialId: entry.materialId.legacyId || entry.materialId._id,
        title: entry.materialId.title,
        courseCode: entry.materialId.courseCode,
        department: entry.materialId.department,
        viewedAt: entry.viewedAt,
      }));

    res.status(200).json({
      status: "success",
      history: items,
      data: items,
    });
  },
);
