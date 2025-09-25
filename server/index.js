import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname } from "path";
import cache from "./utils/cache.js";

dotenv.config();
console.log("Environment keys check:");
console.log("  PORT:", process.env.PORT);
console.log("  STACK_KEY:", process.env.STACK_KEY ? "set" : "missing");
console.log("  WOLFRAM_KEY:", process.env.WOLFRAM_KEY ? "set" : "missing");

// Fix for __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));

// Global fetch fallback
let fetch;
if (typeof global.fetch === "undefined") {
  const { default: nodeFetch } = await import("node-fetch");
  fetch = nodeFetch;
} else {
  fetch = global.fetch;
}

// Helper: safe fetch with timeout
async function safeFetch(url, opts = {}, timeout = 4000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, { ...opts, signal: controller.signal });
    clearTimeout(id);
    return res;
  } catch (e) {
    clearTimeout(id);
    throw e;
  }
}

app.get("/health", (req, res) => res.json({ ok: true }));

// 1) Combined lookup: dictionary + wiki
app.post('/lookup', async (req, res) => {
  const q = (req.body && req.body.q || '').trim();
  if (!q) return res.status(400).json({ error: 'q required' });

  const key = `lookup:${q}`;
  const cached = cache.get(key);
  if (cached) return res.json(cached);

  const result = {};
  // Dictionary API (Free Dictionary API) - public endpoint
  try {
    const dictUrl = `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(q.split(/\s+/)[0])}`;
    const r = await safeFetch(dictUrl, {}, 3000);
    if (r.ok) {
      const j = await r.json();
      // pick first meaning
      if (Array.isArray(j) && j[0] && j[0].meanings) {
        const meaning = j[0].meanings[0];
        result.dictionary = [{ definition: (meaning.definitions && meaning.definitions[0] && meaning.definitions[0].definition) || '' }];
      }
    }
  } catch (e) {
    // no-op: fallback to mock below if nothing found
  }

  // Wikipedia summary
  try {
    const wikiUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(q)}`;
    const r2 = await safeFetch(wikiUrl, {}, 3000);
    if (r2.ok) {
      const j2 = await r2.json();
      if (j2 && j2.extract) result.wiki = { extract: j2.extract, url: j2.content_urls ? j2.content_urls.desktop.page : undefined };
    }
  } catch (e) { }

  // if nothing found, produce a small fallback
  if (!result.dictionary && !result.wiki) {
    result.message = `No direct matches found for "${q}". You can try a more specific phrase or use the Translate/Code tool.`;
  }

  cache.set(key, result);
  res.json(result);
});

// 2) Translate (MyMemory public endpoint fallback)
app.post('/translate', async (req, res) => {
  const q = (req.body && req.body.q || '').trim();
  const target = (req.body && req.body.target) || 'en';
  if (!q) return res.status(400).json({ error: 'q required' });

  const key = `translate:${q}:${target}`;
  const cached = cache.get(key);
  if (cached) return res.json(cached);

  try {
    // MyMemory free API (limited)
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(q)}&langpair=${encodeURIComponent('auto|' + target)}`;
    const r = await safeFetch(url, {}, 3500);
    const j = await r.json();
    const translation = j && j.responseData && j.responseData.translatedText;
    if (translation) {
      const out = { translation };
      cache.set(key, out);
      return res.json(out);
    }
  } catch (e) {
    // fallback below
  }

  // fallback: return the original text and a suggestion
  const fallback = { message: "Translation service unavailable; showing original text.", translation: q };
  cache.set(key, fallback);
  res.json(fallback);
});

// 3) Code / StackOverflow search (StackExchange API – no key for basic usage)
app.post('/code', async (req, res) => {
  const q = (req.body && req.body.q || '').trim();
  if (!q) return res.status(400).json({ error: 'q required' });

  const key = `code:${q}`;
  const cached = cache.get(key);
  if (cached) return res.json(cached);

  try {
    const url = `https://api.stackexchange.com/2.3/search/advanced?order=desc&sort=relevance&q=${encodeURIComponent(q)}&site=stackoverflow&pagesize=5`;
    const r = await safeFetch(url, {}, 4000);
    const j = await r.json();
    if (j && j.items) {
      // For each item, fetch a short snippet (the API returns a snippet field)
      const items = j.items.map(it => ({
        title: it.title,
        link: it.link,
        snippet: it.is_answered ? (it.title) : '',
        score: it.score
      }));
      const out = { items };
      cache.set(key, out);
      return res.json(out);
    }
  } catch (e) {
    console.error(e);
  }

  res.json({ items: [], message: "No results or StackExchange API unreachable." });
});

// 4) Explain (mock/simple summarizer / or external if configured)
// If you want to plug an external LLM, you can add code here and set env variable. For now: simple plain-language explanation generator (very naive)
app.post('/explain', async (req, res) => {
  const q = (req.body && req.body.q || '').trim();
  if (!q) return res.status(400).json({ error: 'q required' });

  // quick heuristic: produce a short generic explanation
  const explanation = `Explanation of "${q}": This term refers to a concept that commonly appears in technical or popular contexts. For a concise understanding: break it down into its basic components, seek authoritative articles or summaries, and look for applied examples or simple tutorials.`;
  res.json({ explanation });
});
// 5) Wolfram Alpha Integration
app.post("/wolfram/:type", async (req, res) => {
  const q = (req.body && req.body.q || "").trim();
  const type = req.params.type;
  const appid = process.env.WOLFRAM_APPID;

  if (!q) return res.status(400).json({ error: "q required" });
  if (!appid) return res.status(500).json({ error: "WOLFRAM_APPID missing" });

  let url = "";

  switch (type) {
    case "simple": // Simple API (images)
      url = `https://api.wolframalpha.com/v1/simple?appid=${appid}&i=${encodeURIComponent(q)}`;
      res.json({ url });
      return;

    case "full": // Full Results API (structured data)
      url = `https://api.wolframalpha.com/v2/query?input=${encodeURIComponent(q)}&appid=${appid}&output=json`;
      break;

    case "summary": // Summary Boxes API
      url = `https://www.wolframalpha.com/api/v1/summary?appid=${appid}&i=${encodeURIComponent(q)}`;
      break;

    case "calc": // Instant Calculators API
      url = `https://www.wolframalpha.com/api/v1/calc?appid=${appid}&i=${encodeURIComponent(q)}`;
      break;

    case "spoken": // Spoken Results API
      url = `https://api.wolframalpha.com/v1/spoken?appid=${appid}&i=${encodeURIComponent(q)}`;
      break;

    case "llm": // LLM API
      url = `https://api.wolframalpha.com/v1/llm-api?appid=${appid}&i=${encodeURIComponent(q)}`;
      break;

    default:
      return res.status(400).json({ error: "Invalid type" });
  }

  try {
    const r = await fetch(url);
    const text = await r.text();
    res.json({ result: text });
  } catch (e) {
    res.status(500).json({ error: "Wolfram API request failed", details: e.message });
  }
});


// health
app.get('/health', (req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 5000; // 🔥 Force port 5000
app.listen(PORT, () => console.log(` Folp backend running on ${PORT}`));