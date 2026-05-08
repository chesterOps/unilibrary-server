import express from "express";
import { chatWithLibrary } from "../controllers/chatbot.controller";

const chatbotRouter = express.Router();

chatbotRouter.post("/", chatWithLibrary);

export default chatbotRouter;
