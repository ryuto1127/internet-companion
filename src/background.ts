const ENABLED_KEY = "icEnabled";

async function getEnabledState(): Promise<boolean> {
  const stored = await chrome.storage.local.get({ [ENABLED_KEY]: true });
  return stored[ENABLED_KEY] !== false;
}

async function setEnabledState(enabled: boolean): Promise<void> {
  await chrome.storage.local.set({ [ENABLED_KEY]: enabled });
}

async function syncActionState(): Promise<void> {
  const enabled = await getEnabledState();

  await chrome.action.setBadgeBackgroundColor({
    color: enabled ? "#F1A16F" : "#68768A",
  });
  await chrome.action.setBadgeText({
    text: enabled ? "ON" : "OFF",
  });
  await chrome.action.setTitle({
    title: enabled
      ? "Internet Companion: On"
      : "Internet Companion: Off",
  });
}

chrome.runtime.onInstalled.addListener(async () => {
  const stored = await chrome.storage.local.get(ENABLED_KEY);
  if (typeof stored[ENABLED_KEY] !== "boolean") {
    await setEnabledState(true);
  }
  await syncActionState();
});

chrome.runtime.onStartup.addListener(async () => {
  await syncActionState();
});

chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.url) {
    return;
  }

  if (
    tab.url.startsWith("chrome://") ||
    tab.url.startsWith("chrome-extension://") ||
    tab.url.startsWith("about:")
  ) {
    return;
  }

  const enabled = !(await getEnabledState());
  await setEnabledState(enabled);
  await syncActionState();
});
