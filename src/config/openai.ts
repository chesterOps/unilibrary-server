import OpenAI from "openai";

/**
 * Lazy-load OpenAI client to avoid initialization errors when OPENAI_API_KEY is missing.
 * This allows the server to start even if OpenAI is not configured, and only fails
 * when an endpoint actually tries to use it.
 */
let openai: OpenAI | null = null;

export function getOpenAI(): OpenAI {
  if (!openai) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error(
        "OPENAI_API_KEY environment variable is not set. " +
          "Please configure it in Render environment variables.",
      );
    }
    openai = new OpenAI({ apiKey });
  }
  return openai;
}
