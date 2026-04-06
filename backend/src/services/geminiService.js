import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export const llmModel = genAI.getGenerativeModel({
  model: "gemini-2.5-flash"
});

export const embeddingModel = genAI.getGenerativeModel({
  model: "embedding-001"
});