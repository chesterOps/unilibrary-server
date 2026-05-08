import express from "express";
import { semanticSearch, keywordSearch } from "../controllers/search.controller";

const searchRouter = express.Router();

// POST /api/v1/search        — semantic (OpenAI embedding + cosine similarity)
// GET  /api/v1/search?q=term — keyword fallback ($regex on title/courseCode/department/tags)
searchRouter.post("/", semanticSearch);
searchRouter.get("/", keywordSearch);

export default searchRouter;
