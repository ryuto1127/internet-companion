"use strict";

// ─── API Module ───────────────────────────────────────────────────────────────

const API_BASE_URL = "http://localhost:3000";

async function analyzeContent(payload) {
  const response = await fetch(`${API_BASE_URL}/api/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

// ─── Extractor Module (uses @mozilla/readability via dynamic import fallback) ─

function extractContent() {
  try {
    // Attempt to use Readability if bundled (full build via npm)
    if (typeof Readability !== "undefined") {
      const clone = document.cloneNode(true);
      const reader = new Readability(clone);
      const article = reader.parse();
      if (article && article.textContent?.trim()) {
        return { title: article.title || document.title, text: article.textContent.trim() };
      }
    }

    // Fallback: heuristic extraction
    return extractHeuristic();
  } catch (err) {
    console.error("[Internet Companion] Extraction failed:", err);
    return extractHeuristic();
  }
}

function extractHeuristic() {
  // Remove noise elements
  const noiseSelectors = [
    "script", "style", "noscript", "iframe", "nav", "header", "footer",
    "aside", ".ad", ".ads", ".advertisement", ".sidebar", ".cookie-banner",
    "[aria-hidden='true']", ".nav", ".menu", ".comments",
  ];

  const docClone = document.cloneNode(true);
  noiseSelectors.forEach((sel) => {
    docClone.querySelectorAll(sel).forEach((el) => el.remove());
  });

  // Score candidate elements
  const candidates = docClone.querySelectorAll(
    "article, [role='main'], main, .post-content, .article-body, .entry-content, .content, #content, #main"
  );

  let bestEl = null;
  let bestScore = 0;

  for (const el of candidates) {
    const text = el.textContent || "";
    const wordCount = text.trim().split(/\s+/).length;
    const linkDensity = getLinkDensity(el);
    const score = wordCount * (1 - linkDensity);
    if (score > bestScore) {
      bestScore = score;
      bestEl = el;
    }
  }

  // If no semantic candidates, find the div with most text
  if (!bestEl || bestScore < 100) {
    docClone.querySelectorAll("div, section, p").forEach((el) => {
      const text = el.textContent || "";
      const wordCount = text.trim().split(/\s+/).length;
      const linkDensity = getLinkDensity(el);
      const score = wordCount * (1 - linkDensity);
      if (score > bestScore) {
        bestScore = score;
        bestEl = el;
      }
    });
  }

  if (!bestEl || bestScore < 50) return null;

  const text = (bestEl.textContent || "").trim().replace(/\s{3,}/g, "\n\n");
  if (!text) return null;

  return {
    title: document.title || "",
    text: text.slice(0, 50000), // cap at 50k chars
  };
}

function getLinkDensity(el) {
  const text = (el.textContent || "").length;
  if (text === 0) return 0;
  let linkText = 0;
  el.querySelectorAll("a").forEach((a) => {
    linkText += (a.textContent || "").length;
  });
  return linkText / text;
}

// ─── Overlay Module ───────────────────────────────────────────────────────────

const OVERLAY_ID = "ic-overlay-root";

class Overlay {
  constructor() {
    this.isVisible = false;
    this.root = this._createRoot();
    this.panel = this._createPanel();
    this.root.appendChild(this.panel);
    document.body.appendChild(this.root);
    this._injectStyles();
  }

  _createRoot() {
    const existing = document.getElementById(OVERLAY_ID);
    if (existing) existing.remove();
    const root = document.createElement("div");
    root.id = OVERLAY_ID;
    return root;
  }

  _createPanel() {
    const panel = document.createElement("div");
    panel.className = "ic-panel";
    panel.innerHTML = `
      <div class="ic-header">
        <span class="ic-logo">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="7" stroke="currentColor" stroke-width="1.5"/>
            <path d="M5 8h6M8 5v6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
          Internet Companion
        </span>
        <button class="ic-close" aria-label="Close">
          <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
            <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
        </button>
      </div>
      <div class="ic-body">
        <div class="ic-content"></div>
      </div>
    `;
    panel.querySelector(".ic-close").addEventListener("click", () => this.hide());
    return panel;
  }

  _injectStyles() {
    const style = document.createElement("style");
    style.textContent = `
      #${OVERLAY_ID} {
        position: fixed !important;
        top: 0 !important;
        right: 0 !important;
        height: 100vh !important;
        z-index: 2147483647 !important;
        font-family: 'Georgia', 'Times New Roman', serif !important;
        pointer-events: none !important;
      }
      #${OVERLAY_ID} * { box-sizing: border-box; margin: 0; padding: 0; }
      .ic-panel {
        position: relative;
        width: 340px;
        height: 100%;
        background: #0f0f0f;
        color: #e8e4dc;
        border-left: 1px solid #222;
        display: flex;
        flex-direction: column;
        transform: translateX(100%);
        transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1);
        pointer-events: all;
        overflow: hidden;
        box-shadow: -8px 0 40px rgba(0,0,0,0.5);
      }
      .ic-panel.ic-visible { transform: translateX(0); }
      .ic-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 14px 18px;
        border-bottom: 1px solid #1a1a1a;
        flex-shrink: 0;
      }
      .ic-logo {
        display: flex;
        align-items: center;
        gap: 7px;
        font-size: 10px;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        color: #555;
        font-family: 'Courier New', monospace;
      }
      .ic-close {
        background: none;
        border: none;
        color: #3a3a3a;
        cursor: pointer;
        padding: 5px;
        display: flex;
        align-items: center;
        transition: color 0.15s;
        border-radius: 3px;
        line-height: 1;
      }
      .ic-close:hover { color: #e8e4dc; background: #1a1a1a; }
      .ic-body {
        flex: 1;
        overflow-y: auto;
        padding: 22px 18px;
        scrollbar-width: thin;
        scrollbar-color: #222 #0f0f0f;
      }
      .ic-body::-webkit-scrollbar { width: 3px; }
      .ic-body::-webkit-scrollbar-track { background: #0f0f0f; }
      .ic-body::-webkit-scrollbar-thumb { background: #222; border-radius: 2px; }
      .ic-content { line-height: 1.7; }
      .ic-spinner {
        display: flex;
        align-items: center;
        gap: 10px;
        color: #444;
        font-size: 11px;
        font-family: 'Courier New', monospace;
        letter-spacing: 0.06em;
      }
      .ic-dots { display: flex; gap: 4px; }
      .ic-dot {
        width: 4px; height: 4px;
        background: #444;
        border-radius: 50%;
        animation: ic-pulse 1.2s ease-in-out infinite;
      }
      .ic-dot:nth-child(2) { animation-delay: 0.2s; }
      .ic-dot:nth-child(3) { animation-delay: 0.4s; }
      @keyframes ic-pulse {
        0%, 80%, 100% { opacity: 0.2; transform: scale(0.8); }
        40% { opacity: 1; transform: scale(1); }
      }
      .ic-summary-label {
        font-family: 'Courier New', monospace;
        font-size: 9px;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        color: #3a3a3a;
        margin-bottom: 14px;
      }
      .ic-summary-text {
        font-size: 14.5px;
        line-height: 1.8;
        color: #bbb8b0;
        font-weight: 400;
      }
      .ic-divider { width: 20px; height: 1px; background: #1e1e1e; margin: 18px 0; }
      .ic-url {
        font-family: 'Courier New', monospace;
        font-size: 9px;
        color: #2a2a2a;
        word-break: break-all;
        line-height: 1.5;
      }
      .ic-error {
        color: #7a3f3f;
        font-size: 12px;
        font-family: 'Courier New', monospace;
        line-height: 1.65;
      }
      .ic-error-icon { font-size: 18px; margin-bottom: 10px; display: block; }
      .ic-empty {
        color: #3a3a3a;
        font-size: 12px;
        font-family: 'Courier New', monospace;
        line-height: 1.65;
      }
      .ic-empty-icon { font-size: 18px; margin-bottom: 10px; display: block; opacity: 0.5; }
    `;
    document.head.appendChild(style);
  }

  show() {
    if (this.isVisible) return;
    this.isVisible = true;
    requestAnimationFrame(() => this.panel.classList.add("ic-visible"));
  }

  hide() {
    this.isVisible = false;
    this.panel.classList.remove("ic-visible");
  }

  toggle() {
    this.isVisible ? this.hide() : this.show();
  }

  setState(state, data = {}) {
    const content = this.panel.querySelector(".ic-content");
    const esc = (s) => String(s)
      .replace(/&/g,"&amp;").replace(/</g,"&lt;")
      .replace(/>/g,"&gt;").replace(/"/g,"&quot;");

    switch (state) {
      case "loading":
        content.innerHTML = `
          <div class="ic-spinner">
            <div class="ic-dots">
              <div class="ic-dot"></div>
              <div class="ic-dot"></div>
              <div class="ic-dot"></div>
            </div>
            Analyzing page
          </div>`;
        break;

      case "success":
        content.innerHTML = `
          <p class="ic-summary-label">Summary</p>
          <p class="ic-summary-text">${esc(data.summary ?? "")}</p>
          <div class="ic-divider"></div>
          <p class="ic-url">${esc(window.location.href)}</p>`;
        break;

      case "error":
        content.innerHTML = `
          <div class="ic-error">
            <span class="ic-error-icon">⚠</span>
            ${esc(data.error ?? "Something went wrong.")}
          </div>`;
        break;

      case "no-content":
        content.innerHTML = `
          <div class="ic-empty">
            <span class="ic-empty-icon">◎</span>
            No readable content found on this page.
          </div>`;
        break;
    }
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

let overlay = null;

function getOrCreateOverlay() {
  if (!overlay) overlay = new Overlay();
  return overlay;
}

async function run() {
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
    const message = err instanceof Error ? err.message : "Failed to connect to API.";
    ui.setState("error", { error: message });
  }
}

chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "IC_TOGGLE") {
    if (overlay) {
      overlay.toggle();
    } else {
      run();
    }
  }
});
