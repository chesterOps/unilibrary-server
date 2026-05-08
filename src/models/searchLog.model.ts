import mongoose, { Document } from "mongoose";

export interface ISearchLog extends Document {
  userId?: mongoose.Types.ObjectId;
  query: string;
  resultsReturned: number;
  createdAt: Date;
}

const searchLogSchema = new mongoose.Schema<ISearchLog>(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
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
  },
  { timestamps: true },
);

// Auto-expire documents after 90 days to keep the collection lean
searchLogSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 60 * 60 * 24 * 90 },
);
searchLogSchema.index({ userId: 1 });
// Text index enables trending-query aggregations
searchLogSchema.index({ query: "text" });

const SearchLog = mongoose.model<ISearchLog>("SearchLog", searchLogSchema);
export default SearchLog;
