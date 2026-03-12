"use strict";

chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id || !tab.url) return;

  if (
    tab.url.startsWith("chrome://") ||
    tab.url.startsWith("chrome-extension://") ||
    tab.url.startsWith("about:")
  ) {
    return;
  }

  try {
    await chrome.tabs.sendMessage(tab.id, { type: "IC_TOGGLE" });
  } catch {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["dist/content.js"],
    });
    await chrome.tabs.sendMessage(tab.id, { type: "IC_TOGGLE" });
  }
});
