import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fetch from "node-fetch";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, ".env") });

console.log(
  "OpenAI Key:",
  process.env.OPENAI_KEY ? "Loaded" : "Missing"
);

const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ ok: true });
});

app.post("/ai", async (req, res) => {
  const q = (req.body.q || "").trim();
  const mode = req.body.mode || "general";

  if (!q) {
    return res.status(400).json({
      error: "q required"
    });
  }

  let systemPrompt = `
You are Folp.

Explain highlighted text clearly.

Rules:
- Use simple language
- Use bullet points
- Be concise
`;

  if (mode === "code") {
    systemPrompt = `
You are a senior software engineer.

Analyze code and explain:

1. What the code does
2. How it works
3. Possible bugs
4. Improvements
5. Example output

Keep explanations beginner friendly.
`;
  }

  try {
    const response = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENAI_KEY}`
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: systemPrompt
            },
            {
              role: "user",
              content: q
            }
          ],
          max_tokens: 300
        })
      }
    );

    const data = await response.json();

    console.log(data);

    const text =
      data?.choices?.[0]?.message?.content ||
      "No response from AI.";

    res.json({
      result: text
    });
  } catch (err) {
    console.error("OpenAI Error:", err);

    res.status(500).json({
      error: "OpenAI request failed."
    });
  }
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`⚡ Folp AI backend running on ${PORT}`);
});