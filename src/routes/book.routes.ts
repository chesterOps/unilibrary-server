import express from "express";
import upload from "../middlewares/multer";
import {
  deleteBook,
  getBooks,
  readBook,
  uploadBook,
} from "../controllers/book.controller";

// Book router
const bookRouter = express.Router();

bookRouter.route("/").post(upload.single("file"), uploadBook).get(getBooks);

bookRouter.route("/:id").get(readBook).delete(deleteBook);

export default bookRouter;
