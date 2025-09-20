// content.js
(() => {
  const OVERLAY_ID = "folp-helper-overlay-v1";

  // create overlay if missing
  function ensureOverlay() {
    if (document.getElementById(OVERLAY_ID)) return;
    const overlay = document.createElement("div");
    overlay.id = OVERLAY_ID;
    overlay.className = "folp-overlay hidden";
    overlay.innerHTML = `
      <div class="folp-card" role="dialog" aria-live="polite">
        <button class="folp-close" title="Close">✕</button>
        <div class="folp-header"><strong>Folp Helper</strong> <span id="folp-type" style="font-size:0.9em;color:#666;margin-left:8px"></span></div>
        <div id="folp-content" class="folp-content">Select text and choose an action.</div>
        <div class="folp-footer">
          <button id="folp-copy">Copy</button>
          <button id="folp-open-src">Open source</button>
        </div>
      </div>`;
    document.documentElement.appendChild(overlay);

    overlay.querySelector(".folp-close").addEventListener("click", () => overlay.classList.add("hidden"));
    overlay.querySelector("#folp-copy").addEventListener("click", async () => {
      const txt = document.getElementById("folp-content").innerText;
      await navigator.clipboard.writeText(txt);
      alert("Copied.");
    });
    overlay.querySelector("#folp-open-src").addEventListener("click", () => {
      overlay.classList.remove("hidden");
      // do nothing special for now
    });
  }

  function showOverlay(type, htmlOrText) {
    ensureOverlay();
    const overlay = document.getElementById(OVERLAY_ID);
    overlay.querySelector("#folp-type").innerText = type.toUpperCase();
    const contentEl = overlay.querySelector("#folp-content");
    if (typeof htmlOrText === "string") contentEl.innerText = htmlOrText;
    else contentEl.innerHTML = htmlOrText;
    overlay.classList.remove("hidden");
  }

  // fetch wrapper to backend
  async function callBackend(endpoint, payload = {}) {
    try {
      const res = await fetch(`http://localhost:5000/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "omit"
      });
      return await res.json();
    } catch (e) {
      console.error("Backend call failed", e);
      return { error: "Backend unreachable. Start server at http://localhost:5000" };
    }
  }

  // main actions
  async function doLookup(selection) {
    showOverlay("lookup", "Looking up…");
    const r = await callBackend("lookup", { q: selection });
    if (r.error) showOverlay("lookup", r.error);
    else {
      // compose compact HTML: dictionary definition + wiki summary (if present)
      let out = "";
      if (r.dictionary && r.dictionary[0]) {
        out += `<div><strong>Definition:</strong> ${r.dictionary[0].meaning || r.dictionary[0].definition}</div>`;
      }
      if (r.wiki && r.wiki.extract) {
        out += `<div style="margin-top:8px"><strong>Wikipedia:</strong> ${r.wiki.extract}</div>`;
      }
      if (!out) out = r.message || "No information found.";
      showOverlay("lookup", out);
    }
  }

  async function doTranslate(selection) {
    showOverlay("translate", "Translating…");
    const r = await callBackend("translate", { q: selection, target: "en" });
    if (r.error) showOverlay("translate", r.error);
    else showOverlay("translate", r.translation || r.message || "No translation");
  }

  async function doCodeSearch(selection) {
    showOverlay("code", "Searching code examples…");
    const r = await callBackend("code", { q: selection });
    if (r.error) showOverlay("code", r.error);
    else {
      const items = r.items || [];
      if (items.length === 0) showOverlay("code", "No relevant code snippets found.");
      else {
        const html = items.slice(0,3).map(it => `<div style="margin-bottom:8px"><a href="${it.link}" target="_blank" rel="noreferrer">${it.title}</a><pre style="white-space:pre-wrap;max-height:160px;overflow:auto;background:#f6f6f6;padding:8px;border-radius:6px">${escapeHtml(it.snippet)}</pre></div>`).join("");
        showOverlay("code", html);
      }
    }
  }

  // small helper
  function escapeHtml(s){ return String(s).replace(/[&<>"']/g, c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' })[c]); }

  // capture selection and route actions
  async function handleAction(type) {
    const sel = (window.getSelection && window.getSelection().toString()) || "";
    if (!sel || sel.trim().length === 0) {
      alert("Please select some text first.");
      return;
    }
    const selection = sel.trim();
    if (type === "lookup") await doLookup(selection);
    else if (type === "translate") await doTranslate(selection);
    else if (type === "code") await doCodeSearch(selection);
    else await doLookup(selection);
  }

  // Listen to custom events dispatched by background worker
  window.addEventListener("Folp:action", (e) => {
    const type = e.detail || "lookup";
    handleAction(type);
  });

  // keyboard shortcut: Ctrl+Shift+L triggers lookup
  document.addEventListener("keydown", (e) => {
    if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "l") handleAction("lookup");
    if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "t") handleAction("translate");
    if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "k") handleAction("code");
  });

  // expose a small API from popup to content (popup sends a message to active tab)
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg && msg.type === "doLookup") { handleAction("lookup"); sendResponse({ok:true}); }
  });

  // create overlay when content script loads
  ensureOverlay();
})();
