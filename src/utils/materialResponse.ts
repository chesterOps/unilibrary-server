import { isValidObjectId } from "mongoose";
import Material from "../models/material.model";

type PlainObject = Record<string, any>;

function asPlain(material: any): PlainObject {
  if (!material) return {};
  return typeof material.toObject === "function" ? material.toObject() : material;
}

export function normalizeMaterial(material: any): PlainObject {
  const item = asPlain(material);
  const uploader =
    item.uploadedBy && typeof item.uploadedBy === "object"
      ? item.uploadedBy
      : null;

  return {
    ...item,
    id: item.legacyId || item._id?.toString?.() || item._id,
    _id: item._id,
    title: item.title,
    courseCode: item.courseCode,
    department: item.department,
    type: item.type || "General",
    description: item.description || "",
    level: item.level,
    academicSession: item.academicSession,
    year: item.academicSession,
    session: item.academicSession,
    uploadedBy: uploader || item.uploadedBy,
    lecturerName: uploader?.name || item.lecturerName || null,
    downloads: item.downloadCount ?? 0,
    downloadCount: item.downloadCount ?? 0,
    views: item.viewCount ?? 0,
    viewCount: item.viewCount ?? 0,
    fileUrl: item.fileUrl,
    fileName:
      item.fileName ||
      (item.fileUrl ? item.fileUrl.split("/").pop() : "") ||
      `${item.slug || "material"}.${item.fileType || "pdf"}`,
    status: item.approved ? "Approved" : "Pending",
    tags: Array.isArray(item.tags) ? item.tags : [],
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

export async function findMaterialByIdentifier(id: string) {
  if (isValidObjectId(id)) {
    const byObjectId = await Material.findById(id);
    if (byObjectId) return byObjectId;
  }

  return Material.findOne({ $or: [{ legacyId: id }, { slug: id }] });
}
