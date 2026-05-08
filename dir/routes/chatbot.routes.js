"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const chatbot_controller_1 = require("../controllers/chatbot.controller");
const chatbotRouter = express_1.default.Router();
chatbotRouter.post("/", chatbot_controller_1.chatWithLibrary);
exports.default = chatbotRouter;
