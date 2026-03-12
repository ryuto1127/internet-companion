import { analyzePage, askPageQuestion, deepDivePage } from "./api";
import { evaluateCredibility } from "./credibility";
import { extractContent } from "./extractor";
import { Overlay } from "./overlay";
import { detectPageContext } from "./pageContext";
import type { CompanionPagePayload, PageSummary } from "./types";

const ENABLED_KEY = "icEnabled";

let overlay: Overlay | null = null;
let isEnabled = false;
let summaryRun: Promise<void> | null = null;
let askRun: Promise<void> | null = null;
let deepDiveRun: Promise<void> | null = null;
let lastAnalyzedUrl: string | null = null;
let scheduledUrlRefresh: number | null = null;
let currentPage: CompanionPagePayload | null = null;
let currentSummary: PageSummary | null = null;

function getOrCreateOverlay(): Overlay {
  if (!overlay) {
    overlay = new Overlay({
      onAsk: (question) => {
        void askCurrentPage(question);
      },
      onDeepDive: () => {
        void deepDiveCurrentPage();
      },
    });
  }

  return overlay;
}

async function getEnabledState(): Promise<boolean> {
  const stored = await chrome.storage.local.get({ [ENABLED_KEY]: true });
  return stored[ENABLED_KEY] !== false;
}

function buildPagePayload(): CompanionPagePayload | null {
  const extracted = extractContent();

  if (!extracted) {
    return null;
  }

  const context = detectPageContext(window.location.href, document, extracted);
  const credibility = evaluateCredibility(window.location.href, context);

  return {
    url: window.location.href,
    title: extracted.title || document.title || "Untitled page",
    text: extracted.text,
    context,
    credibility,
  };
}

async function runSummary(force = false): Promise<void> {
  const currentUrl = window.location.href;

  if (!force && lastAnalyzedUrl === currentUrl && currentPage && currentSummary) {
    getOrCreateOverlay().show();
    return;
  }

  if (summaryRun) {
    return summaryRun;
  }

  const task = (async () => {
    const ui = getOrCreateOverlay();
    const page = buildPagePayload();

    ui.show();

    if (!page) {
      currentPage = null;
      currentSummary = null;
      lastAnalyzedUrl = currentUrl;
      ui.setNoContent();
      return;
    }

    currentPage = page;
    currentSummary = null;
    ui.setLoading(page.title);

    try {
      const summary = await analyzePage(page);
      currentSummary = summary;
      lastAnalyzedUrl = currentUrl;
      ui.setReady(page, summary);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to connect to API.";
      ui.setError(message);
    }
  })();

  summaryRun = task.finally(() => {
    summaryRun = null;
  });

  return summaryRun;
}

async function askCurrentPage(question: string): Promise<void> {
  if (!currentPage || !currentSummary) {
    return;
  }

  if (askRun) {
    return askRun;
  }

  const ui = getOrCreateOverlay();
  ui.setQuestionLoading(question);

  const task = (async () => {
    try {
      const answer = await askPageQuestion(currentPage!, question);
      ui.setQuestionResult(question, answer);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to answer question.";
      ui.setQuestionError(question, message);
    }
  })();

  askRun = task.finally(() => {
    askRun = null;
  });

  return askRun;
}

async function deepDiveCurrentPage(): Promise<void> {
  if (!currentPage || !currentSummary) {
    return;
  }

  if (deepDiveRun) {
    return deepDiveRun;
  }

  const ui = getOrCreateOverlay();
  ui.setDeepDiveLoading();

  const task = (async () => {
    try {
      const deepDive = await deepDivePage(currentPage!);
      ui.setDeepDiveResult(deepDive);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to generate deep dive.";
      ui.setDeepDiveError(message);
    }
  })();

  deepDiveRun = task.finally(() => {
    deepDiveRun = null;
  });

  return deepDiveRun;
}

async function applyEnabledState(enabled: boolean): Promise<void> {
  isEnabled = enabled;

  if (!enabled) {
    overlay?.hide();
    return;
  }

  await runSummary();
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

    void runSummary(true);
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
