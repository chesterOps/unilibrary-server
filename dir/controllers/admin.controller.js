"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.rejectMaterial = exports.approveMaterial = exports.getPendingMaterials = exports.updateUserRole = exports.rejectUser = exports.approveUser = exports.getPendingUsers = exports.getUsers = exports.getStats = void 0;
const user_model_1 = __importDefault(require("../models/user.model"));
const material_model_1 = __importDefault(require("../models/material.model"));
const searchLog_model_1 = __importDefault(require("../models/searchLog.model"));
const appError_1 = __importDefault(require("../utils/appError"));
const catchAsync_1 = __importDefault(require("../utils/catchAsync"));
const materialResponse_1 = require("../utils/materialResponse");
function startOfToday() {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
}
function startOfDaysAgo(daysAgo) {
    const d = startOfToday();
    d.setDate(d.getDate() - daysAgo);
    return d;
}
function normalizeUser(user) {
    const item = typeof user.toObject === "function" ? user.toObject() : user;
    return {
        ...item,
        id: item._id?.toString?.() || item._id,
    };
}
exports.getStats = (0, catchAsync_1.default)(async (_req, res, _next) => {
    const [totalUsers, totalMaterials, totalDownloadsAgg, pendingUsers, pendingMaterials, materialsByDepartmentRaw, usersByRoleRaw, searchesByDayRaw, mostDownloaded, mostSearchedRaw, searchesToday, topMaterialsRaw,] = await Promise.all([
        user_model_1.default.countDocuments(),
        material_model_1.default.countDocuments(),
        material_model_1.default.aggregate([{ $group: { _id: null, total: { $sum: "$downloadCount" } } }]),
        user_model_1.default.countDocuments({ approved: false }),
        material_model_1.default.countDocuments({ approved: false }),
        material_model_1.default.aggregate([
            { $group: { _id: "$department", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
        ]),
        user_model_1.default.aggregate([
            { $group: { _id: "$role", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
        ]),
        searchLog_model_1.default.aggregate([
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
        material_model_1.default.findOne().sort("-downloadCount -createdAt").select("title downloadCount"),
        searchLog_model_1.default.aggregate([{ $group: { _id: "$query", count: { $sum: 1 } } }, { $sort: { count: -1 } }, { $limit: 1 }]),
        searchLog_model_1.default.countDocuments({ createdAt: { $gte: startOfToday() } }),
        material_model_1.default.find().sort("-downloadCount -createdAt").limit(5).select("legacyId title courseCode downloadCount"),
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
    const searchMap = new Map(searchesByDayRaw.map((item) => [
        `${item._id.year}-${String(item._id.month).padStart(2, "0")}-${String(item._id.day).padStart(2, "0")}`,
        item.count,
    ]));
    const searchesOverTime = Array.from({ length: 7 }, (_, index) => {
        const date = startOfDaysAgo(6 - index);
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
        return {
            date: key,
            count: searchMap.get(key) ?? 0,
        };
    });
    const topMaterials = topMaterialsRaw.map((material) => ({
        id: material.legacyId || material._id.toString(),
        _id: material._id,
        title: material.title,
        courseCode: material.courseCode,
        downloads: material.downloadCount ?? 0,
        downloadCount: material.downloadCount ?? 0,
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
                title: mostDownloaded.title,
                downloads: mostDownloaded.downloadCount ?? 0,
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
                    title: mostDownloaded.title,
                    downloads: mostDownloaded.downloadCount ?? 0,
                }
                : null,
            mostSearched: mostSearchedRaw[0]?._id ?? "",
            searchesToday,
            topMaterials,
        },
    });
});
exports.getUsers = (0, catchAsync_1.default)(async (_req, res, _next) => {
    const users = (await user_model_1.default.find().sort("-createdAt").select("-__v")).map(normalizeUser);
    res.status(200).json({
        status: "success",
        users,
        total: users.length,
        data: { users },
    });
});
exports.getPendingUsers = (0, catchAsync_1.default)(async (_req, res, _next) => {
    const users = (await user_model_1.default.find({ approved: false }).sort("-createdAt").select("-__v")).map(normalizeUser);
    res.status(200).json({
        status: "success",
        users,
        total: users.length,
        data: { users },
    });
});
exports.approveUser = (0, catchAsync_1.default)(async (req, res, next) => {
    const user = await user_model_1.default.findByIdAndUpdate(req.params.id, { approved: true }, { new: true, runValidators: true }).select("-__v");
    if (!user) {
        return next(new appError_1.default("No user found with that ID.", 404));
    }
    res.status(200).json({
        status: "success",
        message: "User approved successfully.",
        user: normalizeUser(user),
        data: { user: normalizeUser(user) },
    });
});
exports.rejectUser = (0, catchAsync_1.default)(async (req, res, next) => {
    const user = await user_model_1.default.findByIdAndDelete(req.params.id).select("-__v");
    if (!user) {
        return next(new appError_1.default("No user found with that ID.", 404));
    }
    res.status(200).json({
        status: "success",
        message: "User rejected successfully.",
        user: normalizeUser(user),
        data: { user: normalizeUser(user) },
    });
});
exports.updateUserRole = (0, catchAsync_1.default)(async (req, res, next) => {
    const { id } = req.params;
    const { role } = req.body;
    const validRoles = ["student", "lecturer", "admin"];
    if (!role || !validRoles.includes(role)) {
        return next(new appError_1.default(`Role must be one of: ${validRoles.join(", ")}.`, 400));
    }
    if (req.user._id.toString() === id) {
        return next(new appError_1.default("You cannot change your own role.", 403));
    }
    const user = await user_model_1.default.findByIdAndUpdate(id, { role }, { new: true, runValidators: true }).select("-__v");
    if (!user) {
        return next(new appError_1.default("No user found with that ID.", 404));
    }
    res.status(200).json({
        status: "success",
        user: normalizeUser(user),
        data: { user: normalizeUser(user) },
    });
});
exports.getPendingMaterials = (0, catchAsync_1.default)(async (_req, res, _next) => {
    const materials = await material_model_1.default.find({ approved: false })
        .sort("-createdAt")
        .populate("uploadedBy", "name email role department");
    const normalized = materials.map(materialResponse_1.normalizeMaterial);
    res.status(200).json({
        status: "success",
        materials: normalized,
        total: normalized.length,
        data: { materials: normalized },
    });
});
exports.approveMaterial = (0, catchAsync_1.default)(async (req, res, next) => {
    const material = await (0, materialResponse_1.findMaterialByIdentifier)(req.params.id);
    if (!material) {
        return next(new appError_1.default("No material found with that ID.", 404));
    }
    material.approved = true;
    await material.save();
    await material.populate("uploadedBy", "name email role");
    res.status(200).json({
        status: "success",
        message: "Material approved successfully.",
        material: (0, materialResponse_1.normalizeMaterial)(material),
        data: { material: (0, materialResponse_1.normalizeMaterial)(material) },
    });
});
exports.rejectMaterial = (0, catchAsync_1.default)(async (req, res, next) => {
    const material = await (0, materialResponse_1.findMaterialByIdentifier)(req.params.id);
    if (!material) {
        return next(new appError_1.default("No material found with that ID.", 404));
    }
    const normalized = (0, materialResponse_1.normalizeMaterial)(material);
    await material.deleteOne();
    res.status(200).json({
        status: "success",
        message: "Material rejected successfully.",
        material: normalized,
        data: { material: normalized },
    });
});
