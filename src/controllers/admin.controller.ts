import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import User from "../models/user.model";
import type { UserRole } from "../models/user.model";
import Material from "../models/material.model";
import SearchLog from "../models/searchLog.model";
import AppError from "../utils/appError";
import catchAsync from "../utils/catchAsync";
import { findMaterialByIdentifier, normalizeMaterial } from "../utils/materialResponse";

type RoleCount = { _id: string; count: number };
type DeptCount = { _id: string; count: number };
type DailyCount = { _id: { year: number; month: number; day: number }; count: number };

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfDaysAgo(daysAgo: number): Date {
  const d = startOfToday();
  d.setDate(d.getDate() - daysAgo);
  return d;
}

function normalizeUser(user: any) {
  const item = typeof user.toObject === "function" ? user.toObject() : user;
  return {
    ...item,
    id: item._id?.toString?.() || item._id,
  };
}

export const getStats = catchAsync(
  async (_req: Request, res: Response, _next: NextFunction) => {
    const [
      totalUsers,
      totalMaterials,
      totalDownloadsAgg,
      pendingUsers,
      pendingMaterials,
      materialsByDepartmentRaw,
      usersByRoleRaw,
      searchesByDayRaw,
      mostDownloaded,
      mostSearchedRaw,
      searchesToday,
      topMaterialsRaw,
    ] = await Promise.all([
      User.countDocuments(),
      Material.countDocuments(),
      Material.aggregate([{ $group: { _id: null, total: { $sum: "$downloadCount" } } }]),
      User.countDocuments({ approved: false }),
      Material.countDocuments({ approved: false }),
      Material.aggregate<DeptCount>([
        { $group: { _id: "$department", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      User.aggregate<RoleCount>([
        { $group: { _id: "$role", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      SearchLog.aggregate<DailyCount>([
        { $match: { createdAt: { $gte: startOfDaysAgo(6) } } },
        {
          $group: {
            _id: {
              year: { $year: "$createdAt" },
              month: { $month: "$createdAt" },
              day: { $dayOfMonth: "$createdAt" },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } },
      ]),
      Material.findOne().sort("-downloadCount -createdAt").select("title downloadCount"),
      SearchLog.aggregate([{ $group: { _id: "$query", count: { $sum: 1 } } }, { $sort: { count: -1 } }, { $limit: 1 }]),
      SearchLog.countDocuments({ createdAt: { $gte: startOfToday() } }),
      Material.find().sort("-downloadCount -createdAt").limit(5).select("legacyId title courseCode downloadCount"),
    ]);

    const totalDownloads = totalDownloadsAgg[0]?.total ?? 0;
    const materialsByDepartment = materialsByDepartmentRaw.map((item) => ({
      department: item._id,
      count: item.count,
    }));
    const usersByRole = usersByRoleRaw.map((item) => ({
      role: item._id,
      count: item.count,
    }));

    const searchMap = new Map(
      searchesByDayRaw.map((item) => [
        `${item._id.year}-${String(item._id.month).padStart(2, "0")}-${String(item._id.day).padStart(2, "0")}`,
        item.count,
      ]),
    );

    const searchesOverTime = Array.from({ length: 7 }, (_, index) => {
      const date = startOfDaysAgo(6 - index);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
      return {
        date: key,
        count: searchMap.get(key) ?? 0,
      };
    });

    const topMaterials = topMaterialsRaw.map((material) => ({
      id: (material as any).legacyId || (material as any)._id.toString(),
      _id: (material as any)._id,
      title: (material as any).title,
      courseCode: (material as any).courseCode,
      downloads: (material as any).downloadCount ?? 0,
      downloadCount: (material as any).downloadCount ?? 0,
    }));

    res.status(200).json({
      status: "success",
      totalUsers,
      totalMaterials,
      totalDownloads,
      pendingUsers,
      pendingMaterials,
      materialsByDepartment,
      usersByRole,
      searchesOverTime,
      mostDownloaded: mostDownloaded
        ? {
            title: (mostDownloaded as any).title,
            downloads: (mostDownloaded as any).downloadCount ?? 0,
          }
        : null,
      mostSearched: mostSearchedRaw[0]?._id ?? "",
      searchesToday,
      topMaterials,
      data: {
        totalUsers,
        totalMaterials,
        totalDownloads,
        pendingUsers,
        pendingMaterials,
        materialsByDepartment,
        usersByRole,
        searchesOverTime,
        mostDownloaded: mostDownloaded
          ? {
              title: (mostDownloaded as any).title,
              downloads: (mostDownloaded as any).downloadCount ?? 0,
            }
          : null,
        mostSearched: mostSearchedRaw[0]?._id ?? "",
        searchesToday,
        topMaterials,
      },
    });
  },
);

export const getUsers = catchAsync(
  async (_req: Request, res: Response, _next: NextFunction) => {
    const users = (await User.find().sort("-createdAt").select("-__v")).map(normalizeUser);

    res.status(200).json({
      status: "success",
      users,
      total: users.length,
      data: { users },
    });
  },
);

export const getPendingUsers = catchAsync(
  async (_req: Request, res: Response, _next: NextFunction) => {
    const users = (
      await User.find({ approved: false }).sort("-createdAt").select("-__v")
    ).map(normalizeUser);

    res.status(200).json({
      status: "success",
      users,
      total: users.length,
      data: { users },
    });
  },
);

export const approveUser = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { approved: true },
      { new: true, runValidators: true },
    ).select("-__v");

    if (!user) {
      return next(new AppError("No user found with that ID.", 404));
    }

    res.status(200).json({
      status: "success",
      message: "User approved successfully.",
      user: normalizeUser(user),
      data: { user: normalizeUser(user) },
    });
  },
);

export const rejectUser = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const user = await User.findByIdAndDelete(req.params.id).select("-__v");

    if (!user) {
      return next(new AppError("No user found with that ID.", 404));
    }

    res.status(200).json({
      status: "success",
      message: "User rejected successfully.",
      user: normalizeUser(user),
      data: { user: normalizeUser(user) },
    });
  },
);

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
      user: normalizeUser(user),
      data: { user: normalizeUser(user) },
    });
  },
);

export const getPendingMaterials = catchAsync(
  async (_req: Request, res: Response, _next: NextFunction) => {
    const materials = await Material.find({ approved: false })
      .sort("-createdAt")
      .populate("uploadedBy", "name email role department");

    const normalized = materials.map(normalizeMaterial);

    res.status(200).json({
      status: "success",
      materials: normalized,
      total: normalized.length,
      data: { materials: normalized },
    });
  },
);

export const approveMaterial = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const material = await findMaterialByIdentifier(req.params.id);

    if (!material) {
      return next(new AppError("No material found with that ID.", 404));
    }

    material.approved = true;
    await material.save();
    await material.populate("uploadedBy", "name email role");

    res.status(200).json({
      status: "success",
      message: "Material approved successfully.",
      material: normalizeMaterial(material),
      data: { material: normalizeMaterial(material) },
    });
  },
);

export const rejectMaterial = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const material = await findMaterialByIdentifier(req.params.id);

    if (!material) {
      return next(new AppError("No material found with that ID.", 404));
    }

    const normalized = normalizeMaterial(material);
    await material.deleteOne();

    res.status(200).json({
      status: "success",
      message: "Material rejected successfully.",
      material: normalized,
      data: { material: normalized },
    });
  },
);
