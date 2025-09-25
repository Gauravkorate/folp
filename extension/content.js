// content.js - Consolidated version
// content.js - Sidebar version only
(() => {
  const SIDEBAR_ID = "folp-sidebar-v1";

  // Ensure only one sidebar exists
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
        .folp-sidebar {
          position: fixed;
          top: 0;
          right: 0;
          width: 350px;
          height: 100vh;
          background: #1e1e2f;
          color: white;
          font-family: Arial, sans-serif;
          font-size: 14px;
          display: flex;
          flex-direction: column;
          border-left: 2px solid #444;
          box-shadow: -2px 0 10px rgba(0,0,0,0.3);
          z-index: 999999;
          transition: transform 0.3s ease-in-out;
          transform: translateX(0);
        }
        .folp-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px;
          background: #2b2b3d;
          border-bottom: 1px solid #444;
        }
        #folp-close {
          background: none;
          border: none;
          color: white;
          font-size: 16px;
          cursor: pointer;
        }
        .folp-content {
          padding: 12px;
          overflow-y: auto;
          flex-grow: 1;
        }
        .folp-content pre {
          background: #2d2d40;
          padding: 8px;
          border-radius: 6px;
          white-space: pre-wrap;
          word-wrap: break-word;
          margin-top: 10px;
        }
        .folp-sidebar.hidden {
          transform: translateX(100%);
        }
      </style>
    `;

    document.body.appendChild(sidebar);

    document.getElementById("folp-close").addEventListener("click", () => {
      sidebar.remove();
    });
  }

  // Show the sidebar with new content
  function showSidebar(content) {
    ensureSidebar();
    document.getElementById("folp-content").innerHTML = content;
  }

  // Backend API call
  async function callBackend(endpoint, payload = {}) {
    try {
      const res = await fetch(`http://localhost:5000/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      return await res.json();
    } catch {
      return { error: "Backend unreachable. Start Folp server at http://localhost:5000" };
    }
  }

  async function doWolfram(selection, type="summary") {
  showSidebar(`<i>Querying Wolfram Alpha (${type})...</i>`);
  const result = await callBackend(`wolfram/${type}`, { q: selection });

  if (result.error) {
    showSidebar(`<span style="color:red">${result.error}</span>`);
  } else {
    showSidebar(`<pre>${JSON.stringify(result, null, 2)}</pre>`);
  }
}


  // Lookup logic
  async function doLookup(selection) {
    showSidebar("<i>Searching...</i>");
    const result = await callBackend("lookup", { q: selection });

    if (result.error) {
      showSidebar(`<span style="color:red">${result.error}</span>`);
    } else {
      let html = "";
      if (result.dictionary?.[0]) {
        html += `<p><b>Definition:</b> ${result.dictionary[0].definition}</p>`;
      }
      if (result.wiki?.extract) {
        html += `<p><b>Wikipedia:</b> ${result.wiki.extract}</p>`;
      }
      if (!html) html = "No results found.";
      showSidebar(html);
    }
  }

doWolfram(selection, "summary");  // default mode
 // Listen for Folp action from background.js
window.addEventListener("Folp:action", (e) => {
  const selection = e.detail || window.getSelection().toString().trim();
  if (selection) doLookup(selection);
});

bubble.addEventListener("click", () => {
  doWolfram(text, "summary");  // always summary for now
  bubble.remove();
  bubble = null;
});



  // Keyboard shortcut (Ctrl+Shift+L)
  document.addEventListener("keydown", (e) => {
    if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "l") {
      const selection = window.getSelection().toString().trim();
      if (selection) doLookup(selection);
    }
  });
})();
