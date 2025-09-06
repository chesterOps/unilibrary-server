import Book from "../models/book.model";
import AppError from "../utils/appError";
import catchAsync from "../utils/catchAsync";
import { uploadToMega } from "../utils/handlerMega";
import { slugify } from "../utils/helpers";
import { deleteOne, findAll, findOne } from "../utils/handlerFactory";
import { File } from "megajs";

// Define UploadedFile type
type UploadedFile = {
  megaFileId: string;
  url: string;
  size: number;
  format: string;
};

// Upload book
export const uploadBook = catchAsync(async (req, res, next) => {
  const { title, courseCode, year } = req.body;

  // Validate required fields
  if (!req.file || !title || !courseCode || !year)
    return next(new AppError("Missing required fields", 400));

  // File type
  const fileType = req.file.mimetype.split("/")[1];

  // Upload book file to Mega
  const uploadedFile = (await uploadToMega(
    req.file.buffer,
    `${slugify(title)}.${fileType}`
  )) as UploadedFile;

  // Create new book
  const newBook = new Book({
    title,
    courseCode,
    year,
    file: {
      megaFileId: uploadedFile.megaFileId,
      url: uploadedFile.url,
      size: uploadedFile.size,
      format: fileType,
    },
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
export const readBook = catchAsync(async (req, res, next) => {
  // Get book
  const book = await Book.findById(req.params.id);

  // Check if book was found
  if (!book || !book.file?.url)
    return next(new AppError("Book not found", 404));

  // Create a MEGA file reference from its public link
  const file = File.fromURL(book.file.url);

  // Start downloading the file as a stream
  const stream = file.download({});

  // Get mimetype
  const mimeType =
    book.file.format === "epub" ? "application/epub+zip" : "application/pdf";

  // Get filename
  const fileName = `${slugify(book.title)}.${book.file.format}`;

  // Set content type
  res.setHeader("Content-Type", mimeType);

  // Set response headers so the browser knows it’s a file download
  res.setHeader("Content-Disposition", `inline; filename=${fileName}`);

  // Pipe the file stream directly into the HTTP response
  stream.pipe(res);
});

export const deleteBook = deleteOne(Book);

export const getBooks = findAll(Book, "title");

export const getBook = findOne(Book);
