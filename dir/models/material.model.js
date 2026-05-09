"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const helpers_1 = require("../utils/helpers");
const materialSchema = new mongoose_1.default.Schema({
    legacyId: {
        type: String,
        trim: true,
        unique: true,
        sparse: true,
    },
    title: {
        type: String,
        required: [true, "Title is required"],
        trim: true,
        set: (v) => v.charAt(0).toUpperCase() + v.slice(1),
    },
    slug: {
        type: String,
    },
    courseCode: {
        type: String,
        required: [true, "Course code is required"],
        uppercase: true,
        trim: true,
    },
    department: {
        type: String,
        required: [true, "Department is required"],
        trim: true,
    },
    type: {
        type: String,
        trim: true,
        default: "General",
    },
    description: {
        type: String,
        trim: true,
        default: "",
    },
    level: {
        type: Number,
        required: [true, "Level is required"],
        enum: {
            values: [100, 200, 300, 400, 500],
            message: "Level must be 100, 200, 300, 400, or 500",
        },
    },
    academicSession: {
        type: String,
        required: [true, "Academic session is required"],
        match: [
            /^(\d{4}\/\d{4}|\d{4})$/,
            "Academic session must follow the format YYYY/YYYY or YYYY",
        ],
    },
    fileUrl: {
        type: String,
        required: [true, "File URL is required"],
    },
    fileName: {
        type: String,
        trim: true,
        default: "",
    },
    fileType: {
        type: String,
        required: [true, "File type is required"],
        enum: {
            values: ["pdf", "doc", "docx", "ppt", "pptx", "other"],
            message: "File type must be pdf, doc, docx, ppt, pptx, or other",
        },
    },
    uploadedBy: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: "User",
        required: [true, "Uploader reference is required"],
    },
    tags: {
        type: [String],
        default: [],
    },
    // Stored but excluded from default queries — embeddings are large arrays
    embedding: {
        type: [Number],
        default: [],
        select: false,
    },
    downloadCount: {
        type: Number,
        default: 0,
        min: [0, "Download count cannot be negative"],
    },
    viewCount: {
        type: Number,
        default: 0,
        min: [0, "View count cannot be negative"],
    },
    approved: {
        type: Boolean,
        default: false,
    },
}, { timestamps: true });
// Compound index for the most common filter pattern (filter by course + level)
materialSchema.index({ courseCode: 1, level: 1 });
materialSchema.index({ department: 1, level: 1 });
materialSchema.index({ legacyId: 1 });
materialSchema.index({ tags: 1 });
materialSchema.index({ uploadedBy: 1 });
// Indexes for recommendation engine (embedding queries)
materialSchema.index({ embedding: 1 });
materialSchema.index({ approved: 1, embedding: 1 });
// Compound index for the admin pending-approval queue (filter + sort in one pass)
materialSchema.index({ approved: 1, createdAt: -1 });
// Indexes for popular materials queries (sort by download/view counts)
materialSchema.index({ approved: 1, downloadCount: -1, viewCount: -1, createdAt: -1 });
materialSchema.index({ department: 1, downloadCount: -1, createdAt: -1 });
// Full-text index for NLP keyword search
materialSchema.index({ title: "text", courseCode: "text", tags: "text" }, { weights: { title: 10, courseCode: 5, tags: 3 }, name: "material_text" });
materialSchema.pre("save", function (next) {
    if (!this.isModified("title"))
        return next();
    this.slug = (0, helpers_1.slugify)(this.title);
    next();
});
const Material = mongoose_1.default.model("Material", materialSchema);
exports.default = Material;
