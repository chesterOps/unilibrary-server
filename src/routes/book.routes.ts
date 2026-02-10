import express from "express";
import upload from "../middlewares/multer";
import {
  deleteBook,
  getBook,
  getBooks,
  readBook,
  uploadBook,
} from "../controllers/book.controller";
import { uploadImage } from "../middlewares/image";

// Book router
const bookRouter = express.Router();

bookRouter
  .route("/")
  .post(
    upload.fields([
      { name: "file", maxCount: 1 },
      { name: "image", maxCount: 1 },
    ]),
    uploadImage("image"),
    uploadBook,
  )
  .get(getBooks);

bookRouter.route("/:id").get(getBook).delete(deleteBook);

bookRouter.route("/:id/read").get(readBook);

export default bookRouter;
