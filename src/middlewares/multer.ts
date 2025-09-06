import multer from "multer";

// Configure multer storage (in-memory)
const storage = multer.memoryStorage();

// File filter to accept only PDFs and epub files
const upload = multer({
  storage,
  fileFilter: (_req, file, cb) => {
    if (
      file.mimetype === "application/pdf" ||
      file.mimetype === "application/epub+zip"
    ) {
      cb(null, true);
    } else {
      cb(new Error("Only PDF and epub files are allowed"));
    }
  },
});

export default upload;
