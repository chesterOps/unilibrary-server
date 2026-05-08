"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const searchLogSchema = new mongoose_1.default.Schema({
    userId: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: "User",
        // Optional — unauthenticated searches are still logged
    },
    query: {
        type: String,
        required: [true, "Query is required"],
        trim: true,
        maxlength: [500, "Query cannot exceed 500 characters"],
    },
    resultsReturned: {
        type: Number,
        default: 0,
        min: 0,
    },
}, { timestamps: true });
// Auto-expire documents after 90 days to keep the collection lean
searchLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 90 });
searchLogSchema.index({ userId: 1 });
// Text index enables trending-query aggregations
searchLogSchema.index({ query: "text" });
const SearchLog = mongoose_1.default.model("SearchLog", searchLogSchema);
exports.default = SearchLog;
