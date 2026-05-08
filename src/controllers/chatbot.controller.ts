import { Request, Response, NextFunction } from "express";
import Material from "../models/material.model";
import catchAsync from "../utils/catchAsync";
import AppError from "../utils/appError";
import { normalizeMaterial } from "../utils/materialResponse";

function buildChatReply(message: string, count: number) {
  const lower = message.toLowerCase();

  if (lower.includes("past question")) {
    return `I found ${count} material(s) that look useful for past question practice.`;
  }
  if (lower.includes("gst")) {
    return `Here are ${count} GST-related material(s) from the library.`;
  }
  if (lower.includes("machine learning")) {
    return `I found ${count} machine learning material(s) you can open right away.`;
  }
  if (lower.includes("linear algebra") || lower.includes("mth")) {
    return `I found ${count} mathematics material(s) related to your request.`;
  }
  if (lower.includes("computer science") || lower.includes("csc")) {
    return `I found ${count} computer science material(s) that match your request.`;
  }

  return `I found ${count} material(s) that may help with your request.`;
}

export const chatWithLibrary = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { message } = req.body as {
      message?: string;
      previousMessages?: Array<{ role: string; content: string }>;
    };

    if (!message || !message.trim()) {
      return next(new AppError("Please provide a chatbot message.", 400));
    }

    const escaped = message.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(escaped.split(/\s+/).join("|"), "i");

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
        .limit(5)
        .populate("uploadedBy", "name email role")
    ).map(normalizeMaterial);

    res.status(200).json({
      status: "success",
      reply: buildChatReply(message, materials.length),
      materials,
      data: { reply: buildChatReply(message, materials.length), materials },
    });
  },
);
