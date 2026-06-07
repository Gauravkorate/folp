const markedScript = document.createElement("script");
markedScript.src =
  "https://cdn.jsdelivr.net/npm/marked/marked.min.js";
document.head.appendChild(markedScript);
(() => {
  const SIDEBAR_ID = "folp-sidebar-v1";

  function renderMarkdown(text) {
  if (window.marked) {
    return window.marked.parse(text);
  }

  return text
    .replace(/\n/g, "<br>")
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
}

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
  function showLoading() {
  showSidebar(`
    <div style="padding:20px;text-align:center">
      <div class="loader"></div>

      <div style="
        margin-top:15px;
        color:#bbb;
        font-size:13px;">
        Analyzing selection...
      </div>
    </div>
  `);
}

async function callBackend(endpoint, payload = {}) {
  try {
    const res = await fetch(`http://localhost:5000/${endpoint}`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json"
  },
  body: JSON.stringify(payload)
});

const data = await res.json();

if (!res.ok) {
  return {
    error: data.error || "Backend error"
  };
}

return data;
  } catch (err) {
    return { error: "Backend unreachable. Start Folp server at http://localhost:5000" };
  }
}

  // AI-only Lookup mode
  async function doLookup(selection) {
    showLoading();
    const isCode =
/function|const|let|var|class|import|export|return|=>|if\s*\(|for\s*\(|while\s*\(|try\s*\{|catch\s*\(|console\.log|#include|public\s+class|System\.out\.println|def\s+\w+\(/i
.test(selection);
const result = await callBackend("ai", {
  q: selection,
  mode: isCode ? "code" : "general"
});
if (result.error) {
  showSidebar(`<span style="color:red">${result.error}</span>`);
} else {

  const answer =
    result.result ||
    result.summary ||
    "No response";

  showSidebar(`
  <div style="
    display:flex;
    justify-content:flex-end;
    margin-bottom:10px;
  ">
    <button id="copy-answer" class="folp-copy-btn">
      📋 Copy
    </button>
  </div>

  <div class="folp-answer">
  ${renderMarkdown(answer)}
</div>

<div class="folp-followups">
  <button class="folp-followup">Examples</button>
  <button class="folp-followup">Advantages</button>
  <button class="folp-followup">Disadvantages</button>
  <button class="folp-followup">Explain Simply</button>
</div>
  `);
document.querySelectorAll(".folp-followup")
.forEach(btn => {

  btn.addEventListener("click", () => {

    const followupPrompt =
      `${btn.innerText} of: ${selection}`;

    doLookup(followupPrompt);

  });

});
  const copyBtn = document.getElementById("copy-answer");

  if (copyBtn) {
    copyBtn.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(answer);

        copyBtn.textContent = "✅ Copied";

        setTimeout(() => {
          copyBtn.textContent = "📋 Copy";
        }, 2000);

      } catch (err) {
        copyBtn.textContent = "❌ Failed";
      }
    });
  }
}
}

  // ---- Update event listeners to use one or the other ----
 window.addEventListener("Folp:action", (e) => {
  const selection = e.detail;
  if (selection) {
    doLookup(selection);
  }
});

  document.addEventListener("keydown", (e) => {
    if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "w") {
      const selection = window.getSelection().toString().trim();
      if (selection) doLookup(selection); // Swap with multiLookup to use the multi-source version
    }
  });
})();
