"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBook = exports.getBooks = exports.deleteBook = exports.readBook = exports.uploadBook = void 0;
const book_model_1 = __importDefault(require("../models/book.model"));
const appError_1 = __importDefault(require("../utils/appError"));
const catchAsync_1 = __importDefault(require("../utils/catchAsync"));
const handlerMega_1 = require("../utils/handlerMega");
const helpers_1 = require("../utils/helpers");
const handlerFactory_1 = require("../utils/handlerFactory");
const megajs_1 = require("megajs");
// Upload book
exports.uploadBook = (0, catchAsync_1.default)(async (req, res, next) => {
    const { title, courseCode, year } = req.body;
    // Get files from req.files (when using upload.fields())
    const files = req.files;
    const file = files?.file?.[0];
    const image = req.body.image;
    // Validate required fields
    if (!file || !title || !courseCode || !year || !image)
        return next(new appError_1.default("Missing required fields", 400));
    // File type
    const fileType = file.mimetype.split("/")[1];
    // Upload book file to Mega
    const uploadedFile = (await (0, handlerMega_1.uploadToMega)(file.buffer, `${(0, helpers_1.slugify)(title)}.${fileType}`));
    // Create new book
    const newBook = new book_model_1.default({
        title,
        courseCode,
        year,
        file: {
            megaFileId: uploadedFile.megaFileId,
            url: uploadedFile.url,
            size: uploadedFile.size,
            format: fileType,
        },
        image, // Image info is already attached to req.body by uploadImage middleware
    });
    // Save book
    await newBook.save();
    // Send response
    res.status(201).json({
        status: "success",
        data: newBook,
    });
});
// Read book
exports.readBook = (0, catchAsync_1.default)(async (req, res, next) => {
    // Get book
    const book = await book_model_1.default.findOne({ slug: req.params.id });
    // Check if book was found
    if (!book || !book.file?.url)
        return next(new appError_1.default("Book not found", 404));
    // Create a MEGA file reference from its public link
    const file = megajs_1.File.fromURL(book.file.url);
    // Start downloading the file as a stream
    const stream = file.download({});
    // Get mimetype
    const mimeType = book.file.format === "epub" ? "application/epub+zip" : "application/pdf";
    // Get filename
    const fileName = `${(0, helpers_1.slugify)(book.title)}.${book.file.format}`;
    // Set content type
    res.setHeader("Content-Type", mimeType);
    // Set response headers so the browser knows it’s a file download
    res.setHeader("Content-Disposition", `inline; filename=${fileName}`);
    // Pipe the file stream directly into the HTTP response
    stream.pipe(res);
});
exports.deleteBook = (0, handlerFactory_1.deleteOne)(book_model_1.default);
exports.getBooks = (0, handlerFactory_1.findAll)(book_model_1.default, "title");
exports.getBook = (0, handlerFactory_1.findOne)(book_model_1.default, "slug");
