import mongoose, { Document } from "mongoose";

export interface IViewHistory extends Document {
  userId: mongoose.Types.ObjectId;
  materialId: mongoose.Types.ObjectId;
  viewedAt: Date;
}

const viewHistorySchema = new mongoose.Schema<IViewHistory>(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User reference is required"],
    },
    materialId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Material",
      required: [true, "Material reference is required"],
    },
    viewedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: false },
);

// Primary lookup pattern: "all materials this user has viewed"
viewHistorySchema.index({ userId: 1, viewedAt: -1 });
// Secondary pattern: "all users who viewed this material" (for popularity ranking)
viewHistorySchema.index({ materialId: 1 });
// Exact pair lookup — used before upserting to avoid duplicate same-session entries
viewHistorySchema.index({ userId: 1, materialId: 1 });
// Auto-expire after 180 days — old history degrades recommendation quality anyway
viewHistorySchema.index(
  { viewedAt: 1 },
  { expireAfterSeconds: 60 * 60 * 24 * 180 },
);

const ViewHistory = mongoose.model<IViewHistory>(
  "ViewHistory",
  viewHistorySchema,
);
export default ViewHistory;
