import express from "express";
import upload from "../middlewares/multer";
import {
  deleteBook,
  getBook,
  getBooks,
  readBook,
  uploadBook,
} from "../controllers/book.controller";

// Book router
const bookRouter = express.Router();

bookRouter.route("/").post(upload.single("file"), uploadBook).get(getBooks);

bookRouter.route("/:id").get(getBook).delete(deleteBook);

bookRouter.route("/:id/read").get(readBook);

export default bookRouter;
