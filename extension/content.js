(() => {
  const SIDEBAR_ID = "folp-sidebar-v1";

  function ensureSidebar() {
    if (document.getElementById(SIDEBAR_ID)) return;
    const sidebar = document.createElement("div");
    sidebar.id = SIDEBAR_ID;
    sidebar.innerHTML = `
      <div class="folp-sidebar">
        <div class="folp-header">
          <strong>Folp</strong>
          <button id="folp-close">✕</button>
        </div>
        <div id="folp-content" class="folp-content">
          Select text and click <b>Search with Folp</b>
        </div>
      </div>
      <style>
        .folp-sidebar { position: fixed; top: 0; right: 0; width: 400px; height: 100vh;
          background: #1e1e2f; color: white; font-family: Arial,sans-serif; font-size: 14px;
          display: flex; flex-direction: column; border-left: 2px solid #444;
          box-shadow: -2px 0 10px rgba(0,0,0,0.3); z-index: 999999; transition: transform 0.3s ease-in-out; }
        .folp-header { display: flex; justify-content: space-between; align-items: center; padding: 10px;
          background: #2b2b3d; border-bottom: 1px solid #444; }
        #folp-close { background: none; border: none; color: white; font-size: 16px; cursor: pointer; }
        .folp-content { padding: 12px; overflow-y: auto; flex-grow: 1; }
        .folp-content pre { background: #2d2d40; padding: 8px; border-radius: 6px; white-space: pre-wrap;
          word-wrap: break-word; margin-top: 10px; }
        img.folp-img { max-width: 100%; border-radius: 6px; margin-top: 10px; background: #fff; }
      </style>
    `;
    document.body.appendChild(sidebar);
    document.getElementById("folp-close").addEventListener("click", () => {
      sidebar.remove();
    });
  }

  function showSidebar(content) {
    ensureSidebar();
    document.getElementById("folp-content").innerHTML = content;
  }

async function callBackend(endpoint, payload = {}) {
  try {
    const res = await fetch(`http://localhost:5000/${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return await res.json();
  } catch (err) {
    return { error: "Backend unreachable. Start Folp server at http://localhost:5000" };
  }
}

  // AI-only Lookup mode
  async function doLookup(selection) {
    showSidebar("<i>Thinking...</i>");
    const result = await callBackend("ai", { q: selection });
    if (result.error) {
      showSidebar(`<span style="color:red">${result.error}</span>`);
    } else {
      // result.result, or fallback to summary/result
      showSidebar(`<p>${result.result || result.summary || JSON.stringify(result)}</p>`);
    }
  }

  // ---- Multi-source lookup (keep for future, or swap for the above) ---- //
  async function multiLookup(selection) {
    showSidebar("<i>Searching...</i>");
    let result = {};

    // 1) Dictionary + Wiki
    const dict = await callBackend("lookup", { q: selection });
    if (dict.dictionary?.[0]) result.dictionary = dict.dictionary[0].definition;
    if (dict.wiki?.extract) result.wikipedia = dict.wiki.extract;

    // 2) StackOverflow code section
    let isCodeQuery = /code|java|python|js|javascript|function|error|exception|stack|variable|c\+\+|bug|debug/i.test(selection);
    if (isCodeQuery) {
      const code = await callBackend("code", { q: selection });
      if (code.items && code.items.length > 0) result.stack = code.items;
    }

    // 3) Wolfram fallback (only if not code and not found in previous)
    if (!isCodeQuery && !result.dictionary && !result.wikipedia) {
      const wolfram = await callBackend("wolfram/spoken", { q: selection });
      if (wolfram && wolfram.result) result.wolfram = wolfram.result;
    }

    // 4) (Optional) AI summary fallback
    // const ai = await callBackend("ai", { q: selection });
    // if (ai.summary) result.ai = ai.summary;

    // 5) Build HTML from result object
    let html = "";
    if (result.dictionary) html += `<p><b>Definition:</b> ${result.dictionary}</p>`;
    if (result.wikipedia) html += `<p><b>Wikipedia:</b> ${result.wikipedia}</p>`;
    if (result.stack) {
      html += `<b>StackOverflow:</b><ul>`;
      result.stack.forEach(i => {
        html += `<li><a href="${i.link}" target="_blank">${i.title}</a> (score: ${i.score})</li>`;
      });
      html += `</ul>`;
    }
    if (result.wolfram) html += `<p><b>Wolfram:</b> ${result.wolfram}</p>`;
    if (result.ai) html += `<p><b>AI Summary:</b> ${result.ai}</p>`;
    if (!html) html = "  Folp couldn’t find anything useful. Try rephrasing.";

    showSidebar(html);
  }

  // ---- Update event listeners to use one or the other ----
  window.addEventListener("Folp:action", () => {
    const selection = window.getSelection().toString().trim();
    if (selection) doLookup(selection); // Swap with multiLookup to use the multi-source version
  });

  document.addEventListener("keydown", (e) => {
    if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "w") {
      const selection = window.getSelection().toString().trim();
      if (selection) doLookup(selection); // Swap with multiLookup to use the multi-source version
    }
  });
})();
