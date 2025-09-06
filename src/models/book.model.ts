import mongoose from "mongoose";
import { deleteFromMega } from "../utils/handlerMega";

// Book schema
const bookSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Book title is required"],
      set: (value: string) => value.charAt(0).toUpperCase() + value.slice(1),
      trim: true,
    },
    description: {
      type: String,
      maxlength: 2000,
      required: true,
    },
    category: {
      type: String,
      required: true,
      set: (value: string) => value.charAt(0).toUpperCase() + value.slice(1),
      default: "Other",
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

bookSchema.post("findOneAndDelete", async function (book) {
  // Delete associated files from MEGA
  if (book) {
    // Array to hold nodeIds
    const nodeIds = [];

    // Check for file and coverImage ids
    if (book.file.megaFileId) nodeIds.push(book.file.megaFileId);
    if (book.coverImage.megaFileId) nodeIds.push(book.coverImage.megaFileId);

    // Delete files from MEGA
    await deleteFromMega(nodeIds);
  }
});

const Book = mongoose.model("Book", bookSchema);

export default Book;
