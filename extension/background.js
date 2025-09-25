// background.js
// background.js
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "folpSearch",
    title: "Search with Folp",
    contexts: ["selection"],
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "folpSearch" && info.selectionText) {
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: (text) => {
        window.dispatchEvent(new CustomEvent("Folp:action", { detail: text }));
      },
      args: [info.selectionText],
    });
  }
});


async function startOAuth() {
  const clientId ="34953"; // from provider
  const redirectUri = chrome.identity.getRedirectURL("callback.html");
  const authUrl = `https://example.com/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(
    redirectUri
  )}&response_type=code&scope=profile`;

  chrome.identity.launchWebAuthFlow(
    {
      url: authUrl,
      interactive: true
    },
    (redirectedTo) => {
      if (chrome.runtime.lastError) {
        console.error("OAuth error", chrome.runtime.lastError);
        return;
      }

      const url = new URL(redirectedTo);
      const code = url.searchParams.get("code");
      if (code) {
        console.log("Got OAuth code:", code);
        // TODO: send this code to your backend to exchange for access_token
      }
    }
  );
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "doLookup") {
    // send action to content script again OR call backend directly
    chrome.scripting.executeScript({
      target: { tabId: sender.tab.id },
      func: (t) => window.dispatchEvent(new CustomEvent('Folp:action', { detail: "lookup" })),
      args: [msg.text]
    });
  }
});

