// background.js (service worker)
chrome.runtime.onInstalled.addListener(() => {
  // Context menu entries for quick actions
  chrome.contextMenus.create({ id: "folp_lookup", title: "Folp: Quick Lookup", contexts: ["selection"] });
  chrome.contextMenus.create({ id: "folp_translate", title: "Folp: Translate selection", contexts: ["selection"] });
  chrome.contextMenus.create({ id: "folp_code", title: "Folp: Find code snippet", contexts: ["selection"] });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (!tab || !tab.id) return;
  const actionMap = {
    folp_lookup: "lookup",
    folp_translate: "translate",
    folp_code: "code"
  };
  const type = actionMap[info.menuItemId] || "lookup";
  // trigger the content script to summarize/lookup selection
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: (t) => window.dispatchEvent(new CustomEvent('Folp:action', { detail: t })),
    args: [type]
  });
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg && msg.type === "ping") sendResponse({ ok: true });
});
