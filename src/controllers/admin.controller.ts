import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import User from "../models/user.model";
import type { UserRole } from "../models/user.model";
import Material from "../models/material.model";
import SearchLog from "../models/searchLog.model";
import AppError from "../utils/appError";
import catchAsync from "../utils/catchAsync";

// Local aggregate return-shape types
type RoleCount = { _id: string; count: number };
type DeptCount = { department: string; count: number };
type DownloadTotal = { _id: null; total: number };
type QueryCount = { query: string; count: number };

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

// ── GET /api/v1/admin/stats ───────────────────────────────────────────────────
//
// All nine queries run in parallel via Promise.all — total latency equals
// the slowest single query, not the sum of all nine.

export const getStats = catchAsync(
  async (_req: Request, res: Response, _next: NextFunction) => {
    const [
      usersByRole,
      materialsByDept,
      downloadsAgg,
      mostDownloaded,
      topSearchAgg,
      searchesToday,
      totalUsers,
      totalMaterials,
      pendingCount,
    ] = await Promise.all([
      User.aggregate<RoleCount>([
        { $group: { _id: "$role", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),

      Material.aggregate<DeptCount>([
        { $group: { _id: "$department", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $project: { _id: 0, department: "$_id", count: 1 } },
      ]),

      Material.aggregate<DownloadTotal>([
        { $group: { _id: null, total: { $sum: "$downloadCount" } } },
      ]),

      // embedding has select:false — excluded automatically; no extra .select() needed
      Material.findOne().sort("-downloadCount").populate("uploadedBy", "name email"),

      SearchLog.aggregate<QueryCount>([
        { $group: { _id: "$query", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 1 },
        { $project: { _id: 0, query: "$_id", count: 1 } },
      ]),

      SearchLog.countDocuments({ createdAt: { $gte: startOfToday() } }),
      User.countDocuments(),
      Material.countDocuments(),
      Material.countDocuments({ approved: false }),
    ]);

    // Reshape role array → { student: N, lecturer: N, admin: N }
    const byRole = usersByRole.reduce<Record<string, number>>((acc, r) => {
      acc[r._id] = r.count;
      return acc;
    }, {});

    res.status(200).json({
      status: "success",
      data: {
        users: {
          total: totalUsers,
          byRole,
        },
        materials: {
          total: totalMaterials,
          pending: pendingCount,
          byDepartment: materialsByDept,
        },
        downloads: {
          total: downloadsAgg[0]?.total ?? 0,
          mostDownloaded,
        },
        searches: {
          today: searchesToday,
          topQuery: topSearchAgg[0] ?? null,
        },
      },
    });
  },
);

// ── GET /api/v1/admin/users ───────────────────────────────────────────────────
//
// Paginated. Optional query params: ?role=student|lecturer|admin  ?department=X

export const getUsers = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const { role, department, page = 1, limit = 20 } = req.query;

    const filter: Record<string, unknown> = {};
    if (role && typeof role === "string") filter.role = role;
    if (department && typeof department === "string") {
      filter.department = new RegExp(department.trim(), "i");
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [users, total] = await Promise.all([
      User.find(filter)
        .skip(skip)
        .limit(Number(limit))
        .sort("-createdAt")
        .select("-__v"),
      User.countDocuments(filter),
    ]);

    res.status(200).json({
      status: "success",
      total,
      page: Number(page),
      length: users.length,
      data: { users },
    });
  },
);

// ── PUT /api/v1/admin/users/:id/role ──────────────────────────────────────────

export const updateUserRole = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const { role } = req.body as { role: UserRole };

    const validRoles: UserRole[] = ["student", "lecturer", "admin"];
    if (!role || !validRoles.includes(role)) {
      return next(
        new AppError(`Role must be one of: ${validRoles.join(", ")}.`, 400),
      );
    }

    // An admin changing their own role could lock themselves out of the panel
    if ((req.user!._id as mongoose.Types.ObjectId).toString() === id) {
      return next(new AppError("You cannot change your own role.", 403));
    }

    const user = await User.findByIdAndUpdate(
      id,
      { role },
      { new: true, runValidators: true },
    ).select("-__v");

    if (!user) {
      return next(new AppError("No user found with that ID.", 404));
    }

    res.status(200).json({
      status: "success",
      data: { user },
    });
  },
);

// ── GET /api/v1/admin/materials/pending ───────────────────────────────────────

export const getPendingMaterials = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const { page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const [materials, total] = await Promise.all([
      Material.find({ approved: false })
        .skip(skip)
        .limit(Number(limit))
        .sort("-createdAt")
        .populate("uploadedBy", "name email role department"),
      Material.countDocuments({ approved: false }),
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

// ── PUT /api/v1/admin/materials/:id/approve ───────────────────────────────────

export const approveMaterial = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const material = await Material.findByIdAndUpdate(
      req.params.id,
      { approved: true },
      { new: true },
    ).populate("uploadedBy", "name email role");

    if (!material) {
      return next(new AppError("No material found with that ID.", 404));
    }

    res.status(200).json({
      status: "success",
      data: { material },
    });
  },
);
