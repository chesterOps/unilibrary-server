"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const handlerMega_1 = require("../utils/handlerMega");
const helpers_1 = require("../utils/helpers");
const image_1 = require("../middlewares/image");
// Book schema
const bookSchema = new mongoose_1.default.Schema({
    title: {
        type: String,
        required: [true, "Book title is required"],
        set: (value) => value.charAt(0).toUpperCase() + value.slice(1),
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
    image: {
        type: {
            public_id: { type: String, required: true },
            url: { type: String, required: true },
        },
        required: true,
    },
}, { timestamps: true });
bookSchema.post("findOneAndDelete", async function (doc) {
    // Delete associated files from MEGA
    if (doc) {
        // Check for file
        if (doc.file.megaFileId)
            await (0, handlerMega_1.deleteOne)(doc.file.megaFileId);
        // Check for image
        if (doc.image.public_id)
            await (0, image_1.deleteImage)(doc.image.public_id);
    }
});
bookSchema.pre("save", function (next) {
    if (!this.isModified("title"))
        return next();
    this.slug = (0, helpers_1.slugify)(this.title);
    next();
});
const Book = mongoose_1.default.model("Book", bookSchema);
exports.default = Book;
