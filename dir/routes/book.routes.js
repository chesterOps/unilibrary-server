"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const multer_1 = __importDefault(require("../middlewares/multer"));
const book_controller_1 = require("../controllers/book.controller");
const image_1 = require("../middlewares/image");
// Book router
const bookRouter = express_1.default.Router();
bookRouter
    .route("/")
    .post(multer_1.default.fields([
    { name: "file", maxCount: 1 },
    { name: "image", maxCount: 1 },
]), (0, image_1.uploadImage)("image"), book_controller_1.uploadBook)
    .get(book_controller_1.getBooks);
bookRouter.route("/:id").get(book_controller_1.getBook).delete(book_controller_1.deleteBook);
bookRouter.route("/:id/read").get(book_controller_1.readBook);
exports.default = bookRouter;
