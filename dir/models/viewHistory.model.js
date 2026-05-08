"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const viewHistorySchema = new mongoose_1.default.Schema({
    userId: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: "User",
        required: [true, "User reference is required"],
    },
    materialId: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: "Material",
        required: [true, "Material reference is required"],
    },
    viewedAt: {
        type: Date,
        default: Date.now,
    },
}, { timestamps: false });
// Primary lookup pattern: "all materials this user has viewed"
viewHistorySchema.index({ userId: 1, viewedAt: -1 });
// Secondary pattern: "all users who viewed this material" (for popularity ranking)
viewHistorySchema.index({ materialId: 1 });
// Exact pair lookup — used before upserting to avoid duplicate same-session entries
viewHistorySchema.index({ userId: 1, materialId: 1 });
// Auto-expire after 180 days — old history degrades recommendation quality anyway
viewHistorySchema.index({ viewedAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 180 });
const ViewHistory = mongoose_1.default.model("ViewHistory", viewHistorySchema);
exports.default = ViewHistory;
