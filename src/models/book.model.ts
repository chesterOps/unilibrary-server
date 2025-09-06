import mongoose from "mongoose";
import { deleteOne } from "../utils/handlerMega";
import { slugify } from "../utils/helpers";

// Book schema
const bookSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Book title is required"],
      set: (value: string) => value.charAt(0).toUpperCase() + value.slice(1),
      trim: true,
    },
    courseCode: {
      type: String,
      required: true,
    },
    slug: String,
    year: {
      type: Number,
      required: true,
    },
    file: {
      type: {
        megaFileId: { type: String, required: true },
        url: { type: String, required: true },
        size: { type: Number, required: true },
        format: { type: String, required: true },
      },
    },
  },
  { timestamps: true }
);

bookSchema.post("findOneAndDelete", async function (doc) {
  // Delete associated files from MEGA

  if (doc) {
    // Check for file
    if (doc.file.megaFileId) await deleteOne(doc.file.megaFileId);
  }
});

bookSchema.pre("save", function (next) {
  if (!this.isModified("title")) return next();
  this.slug = slugify(this.title);
  next();
});

const Book = mongoose.model("Book", bookSchema);

export default Book;
