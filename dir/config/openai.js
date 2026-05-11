"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOpenAI = getOpenAI;
const openai_1 = __importDefault(require("openai"));
/**
 * Lazy-load OpenAI client to avoid initialization errors when OPENAI_API_KEY is missing.
 * This allows the server to start even if OpenAI is not configured, and only fails
 * when an endpoint actually tries to use it.
 */
let openai = null;
function getOpenAI() {
    if (!openai) {
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
            throw new Error("OPENAI_API_KEY environment variable is not set. " +
                "Please configure it in Render environment variables.");
        }
        openai = new openai_1.default({ apiKey });
    }
    return openai;
}
