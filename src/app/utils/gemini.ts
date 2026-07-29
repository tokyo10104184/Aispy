import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY || "";

export const getGeminiClient = () => {
  if (!apiKey) return null;
  return new GoogleGenerativeAI(apiKey);
};
