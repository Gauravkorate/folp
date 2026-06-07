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
  "OPENROUTER KEY:",
  process.env.OPENROUTER_API_KEY ? "FOUND" : "MISSING",
);

const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ ok: true });
});
app.get("/ai-test", (req, res) => {
  res.json({
    status: "working",
  });
});

app.get("/models", async (req, res) => {
  try {
    const response = await fetch(
      "https://openrouter.ai/api/v1/models",
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        },
      }
    );

    const data = await response.json();

    console.log("MODELS STATUS:", response.status);

    res.json(data);
  } catch (err) {
    console.error(err);

    res.status(500).json({
      error: "Failed to fetch models",
    });
  }
});
app.post("/ai", async (req, res) => {
  const q = (req.body.q || "").trim();
  const mode = req.body.mode || "general";

  if (!q) {
    return res.status(400).json({
      error: "q required",
    });
  }

  let systemPrompt = `
You are Folp AI.

When user highlights text:

- Explain it clearly.
- Use simple language.
- Use bullet points.
- Give examples when useful.
- If code is provided:
  - Explain line by line.
  - Find bugs.
  - Suggest improvements.
- Format output in Markdown.
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
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "HTTP-Referer": "http://localhost:5000",
          "X-Title": "Folp",
        },
        body: JSON.stringify({
  model: "nvidia/nemotron-3-ultra-550b-a55b:free",
          messages: [
            {
              role: "system",
              content: systemPrompt,
            },
            {
              role: "user",
              content: q,
            },
          ],
          max_tokens: 500,
          temperature: 0.7,
        }),
      }
    );

    const rawText = await response.text();

    console.log("STATUS:", response.status);
    console.log("RAW RESPONSE:");
    console.log(rawText);

    let data;

    try {
      data = JSON.parse(rawText);
    } catch {
      return res.status(500).json({
        error: "Invalid JSON returned from OpenRouter",
      });
    }

    if (!response.ok) {
      return res.status(500).json({
        error: data?.error?.message || "OpenRouter request failed",
      });
    }

    const text =
      data?.choices?.[0]?.message?.content ||
      "No response from AI.";

    return res.json({
      result: text,
    });

  } catch (err) {
    console.error("OpenRouter Error:", err);

    return res.status(500).json({
      error: err.message || "Request failed",
    });
  }
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`⚡ Folp AI backend running on ${PORT}`);
});
