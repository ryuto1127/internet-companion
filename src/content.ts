import { Overlay } from "./overlay";
import { extractContent } from "./extractor";
import { analyzeContent } from "./api";

let overlay: Overlay | null = null;

function getOrCreateOverlay(): Overlay {
  if (!overlay) {
    overlay = new Overlay();
  }
  return overlay;
}

async function run(): Promise<void> {
  const ui = getOrCreateOverlay();
  ui.show();
  ui.setState("loading");

  const extracted = extractContent();

  if (!extracted) {
    ui.setState("no-content");
    return;
  }

  try {
    const result = await analyzeContent({
      url: window.location.href,
      title: extracted.title,
      text: extracted.text,
    });

    ui.setState("success", { summary: result.summary });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to connect to API.";
    ui.setState("error", { error: message });
  }
}

// Listen for trigger from background
chrome.runtime.onMessage.addListener((message: { type: string }) => {
  if (message.type === "IC_TOGGLE") {
    if (overlay) {
      overlay.toggle();
    } else {
      run();
    }
  }
});
