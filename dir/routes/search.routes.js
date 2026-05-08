"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const search_controller_1 = require("../controllers/search.controller");
const searchRouter = express_1.default.Router();
// POST /api/v1/search        — semantic (OpenAI embedding + cosine similarity)
// GET  /api/v1/search?q=term — keyword fallback ($regex on title/courseCode/department/tags)
searchRouter.post("/", search_controller_1.semanticSearch);
searchRouter.get("/", search_controller_1.keywordSearch);
exports.default = searchRouter;
