// background.js
chrome.runtime.onInstalled.addListener(() => {
  // Single context menu for Folp
  chrome.contextMenus.create({
    id: "folp_search",
    title: "Search with Folp",
    contexts: ["selection"]
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (!tab || !tab.id) return;
  // Always trigger "lookup" for now
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: (selection) => {
      window.dispatchEvent(new CustomEvent("Folp:action", { detail: selection }));
    },
    args: [info.selectionText] // pass selected text directly
  });
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg && msg.type === "ping") sendResponse({ ok: true });
});
