import fetch from "node-fetch";

// Your existing advanced function
export async function doWolfram(query, type = "spoken") {
  const appid = process.env.WOLFRAM_APPID;
  if (!appid) return "⚠️ Wolfram AppID missing.";

  let url = "";
  let mode = type.toLowerCase();

  switch (mode) {
    case "simple":
      url = `https://api.wolframalpha.com/v1/simple?appid=${appid}&i=${encodeURIComponent(query)}`;
      return { mode, query, url, note: "Direct image URL" };

    case "full":
      url = `https://api.wolframalpha.com/v2/query?input=${encodeURIComponent(query)}&appid=${appid}&output=json`;
      break;

    case "summary":
      url = `https://www.wolframalpha.com/api/v1/summary?appid=${appid}&i=${encodeURIComponent(query)}`;
      break;

    case "calc":
      url = `https://www.wolframalpha.com/api/v1/calc?appid=${appid}&i=${encodeURIComponent(query)}`;
      break;

    case "spoken":
      url = `https://api.wolframalpha.com/v1/spoken?appid=${appid}&i=${encodeURIComponent(query)}`;
      break;

    case "llm":
      url = `https://api.wolframalpha.com/v1/llm-api?appid=${appid}&i=${encodeURIComponent(query)}`;
      break;

    default:
      return { error: `Invalid type '${type}'. Use one of: simple, full, summary, calc, spoken, llm.` };
  }

  try {
    const response = await fetch(url);
    const text = await response.text();

    let parsed = text;
    if (mode === "full" || mode === "summary" || mode === "calc") {
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = text; // fallback
      }
    }

    return {
      mode,
      query,
      result: parsed,
    };
  } catch (err) {
    return { error: "Wolfram API request failed", details: err.message };
  }
}

// The new, minimalist version as a separate export
export async function doWolframSimple(query, type = "spoken") {
  const appid = process.env.WOLFRAM_APPID;
  if (!appid) return "⚠️ Wolfram AppID missing.";

  const url = `https://api.wolframalpha.com/v1/${type}?appid=${appid}&i=${encodeURIComponent(query)}`;

  try {
    const res = await fetch(url);
    return await res.text();
  } catch (err) {
    console.error("Wolfram error:", err);
    return "⚠️ Wolfram request failed.";
  }
}
