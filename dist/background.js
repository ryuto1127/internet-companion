/******/ (() => { // webpackBootstrap
/******/ 	"use strict";

chrome.action.onClicked.addListener(async (tab) => {
    if (!tab.id || !tab.url)
        return;
    // Skip chrome:// and extension pages
    if (tab.url.startsWith("chrome://") ||
        tab.url.startsWith("chrome-extension://") ||
        tab.url.startsWith("about:")) {
        return;
    }
    try {
        await chrome.tabs.sendMessage(tab.id, { type: "IC_TOGGLE" });
    }
    catch {
        // Content script not yet injected — inject it first then send
        await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ["dist/content.js"],
        });
        await chrome.tabs.sendMessage(tab.id, { type: "IC_TOGGLE" });
    }
});

/******/ })()
;
//# sourceMappingURL=background.js.map