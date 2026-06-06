import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fetch from "node-fetch";
import { openaiSummarize } from "./utils/openai.js";

import path from "path";
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, ".env") });
console.log("Loaded key:", process.env.OPENAI_API_KEY ? "Found" : "Missing");


const app = express();
app.use(cors());
app.use(express.json());

//   Health check
app.get("/health", (req, res) => res.json({ ok: true }));

//   OpenAI Smart Summary Endpoint
app.post("/ai", async (req, res) => {
  const q = ((req.body && req.body.q) || "").trim();
  if (!q) return res.status(400).json({ error: "q required" });

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "You are Folp, a smart assistant that explains, summarizes, or solves anything concisely.",
          },
          { role: "user", content: q },
        ],
        max_tokens: 300,
      }),
    });

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || "No response from AI.";
    res.json({ result: text });
  } catch (err) {
    console.error("OpenAI Error:", err.message);
    res.status(500).json({ error: "OpenAI request failed." });
  }
});

// Alternative: Use utils/openai.js summarizer route
app.post("/ai/summarize", async (req, res) => {
  const q = ((req.body && req.body.q) || "").trim();
  if (!q) return res.status(400).json({ error: "q required" });

  const result = await openaiSummarize(q);
  res.json({ summary: result });
});

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`⚡ Folp AI backend running on ${PORT}`));
