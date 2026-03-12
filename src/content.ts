import { Overlay } from "./overlay";
import { extractContent } from "./extractor";
import { analyzeContent } from "./api";

const ENABLED_KEY = "icEnabled";

let overlay: Overlay | null = null;
let isEnabled = false;
let inFlightRun: Promise<void> | null = null;
let lastAnalyzedUrl: string | null = null;
let scheduledUrlRefresh: number | null = null;

function getOrCreateOverlay(): Overlay {
  if (!overlay) {
    overlay = new Overlay();
  }

  return overlay;
}

async function getEnabledState(): Promise<boolean> {
  const stored = await chrome.storage.local.get({ [ENABLED_KEY]: true });
  return stored[ENABLED_KEY] !== false;
}

async function run(force = false): Promise<void> {
  const currentUrl = window.location.href;

  if (!force && lastAnalyzedUrl === currentUrl && overlay) {
    overlay.show();
    return;
  }

  if (inFlightRun) {
    return inFlightRun;
  }

  const task = (async () => {
    const ui = getOrCreateOverlay();
    ui.show();
    ui.setState("loading");

    const extracted = extractContent();

    if (!extracted) {
      lastAnalyzedUrl = currentUrl;
      ui.setState("no-content");
      return;
    }

    try {
      const result = await analyzeContent({
        url: currentUrl,
        title: extracted.title,
        text: extracted.text,
      });

      lastAnalyzedUrl = currentUrl;
      ui.setState("success", {
        title: extracted.title,
        standfirst: result.standfirst,
        summary: result.summary,
        bullets: result.bullets,
        model: result.model,
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to connect to API.";
      ui.setState("error", { error: message });
    }
  })();

  inFlightRun = task.finally(() => {
    inFlightRun = null;
  });

  return inFlightRun;
}

async function applyEnabledState(enabled: boolean): Promise<void> {
  isEnabled = enabled;

  if (!enabled) {
    overlay?.hide();
    return;
  }

  await run();
}

function scheduleRefreshForNavigation(): void {
  if (!isEnabled) {
    return;
  }

  if (scheduledUrlRefresh !== null) {
    window.clearTimeout(scheduledUrlRefresh);
  }

  scheduledUrlRefresh = window.setTimeout(() => {
    scheduledUrlRefresh = null;

    if (!isEnabled) {
      return;
    }

    if (window.location.href === lastAnalyzedUrl) {
      return;
    }

    void run(true);
  }, 350);
}

function watchUrlChanges(): void {
  const originalPushState = history.pushState.bind(history);
  const originalReplaceState = history.replaceState.bind(history);

  history.pushState = ((...args: Parameters<History["pushState"]>) => {
    const result = originalPushState(...args);
    scheduleRefreshForNavigation();
    return result;
  }) as History["pushState"];

  history.replaceState = ((...args: Parameters<History["replaceState"]>) => {
    const result = originalReplaceState(...args);
    scheduleRefreshForNavigation();
    return result;
  }) as History["replaceState"];

  window.addEventListener("popstate", scheduleRefreshForNavigation);
  window.addEventListener("hashchange", scheduleRefreshForNavigation);
}

async function initialize(): Promise<void> {
  watchUrlChanges();

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "local" || !changes[ENABLED_KEY]) {
      return;
    }

    void applyEnabledState(changes[ENABLED_KEY].newValue !== false);
  });

  await applyEnabledState(await getEnabledState());
}

void initialize();
