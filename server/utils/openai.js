
// utils/openai.js
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import OpenAI from "openai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ✅ Force dotenv to load using absolute path
dotenv.config({ path: path.join(__dirname, "../.env") });

console.log("OpenAI key loaded:", process.env.OPENAI_API_KEY ? "Found" : "Missing");

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function openaiSummarize(query) {
  if (!process.env.OPENAI_API_KEY) {
    console.error("Missing OpenAI API key");
    return "OpenAI key missing.";
  }

  try {
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are Folp, a helpful AI that explains things simply." },
        { role: "user", content: `Summarize or answer clearly: ${query}` },
      ],
      
    });

    return completion.choices?.[0]?.message?.content || "No response from AI.";
  } catch (err) {
    console.error("OpenAI Error:", err.message);
    return "AI request failed.";
  }
}
