const OVERLAY_ID = "ic-overlay-root";
const STYLE_ID = "ic-overlay-style";

type OverlayState = "loading" | "success" | "error" | "no-content";

interface OverlayData {
  title?: string;
  standfirst?: string;
  summary?: string;
  bullets?: string[];
  model?: string;
  error?: string;
}

export class Overlay {
  private root: HTMLElement;
  private panel: HTMLElement;
  private isVisible = false;

  constructor() {
    this.root = this.createRoot();
    this.panel = this.createPanel();
    this.root.appendChild(this.panel);
    document.body.appendChild(this.root);
    this.injectStyles();
  }

  private createRoot(): HTMLElement {
    const existing = document.getElementById(OVERLAY_ID);
    if (existing) {
      existing.remove();
    }

    const root = document.createElement("div");
    root.id = OVERLAY_ID;
    return root;
  }

  private createPanel(): HTMLElement {
    const panel = document.createElement("aside");
    panel.className = "ic-panel";
    panel.setAttribute("aria-live", "polite");
    panel.innerHTML = `
      <div class="ic-header">
        <div class="ic-brand">
          <span class="ic-mark">IC</span>
          <div class="ic-brand-copy">
            <span class="ic-brand-name">Internet Companion</span>
            <span class="ic-brand-tag">Reading brief</span>
          </div>
        </div>
        <button class="ic-close" aria-label="Close">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
        </button>
      </div>
      <div class="ic-body">
        <div class="ic-content"></div>
      </div>
    `;

    panel
      .querySelector(".ic-close")!
      .addEventListener("click", () => this.hide());

    return panel;
  }

  private injectStyles(): void {
    document.getElementById(STYLE_ID)?.remove();

    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      #${OVERLAY_ID} {
        --ic-bg: rgba(11, 17, 27, 0.96);
        --ic-bg-soft: rgba(22, 30, 43, 0.9);
        --ic-card: rgba(255, 248, 239, 0.07);
        --ic-card-strong: rgba(255, 248, 239, 0.11);
        --ic-line: rgba(255, 248, 239, 0.12);
        --ic-text: #f6efe5;
        --ic-muted: #d3c7b6;
        --ic-dim: #8f9bad;
        --ic-accent: #f1a16f;
        --ic-accent-soft: rgba(241, 161, 111, 0.18);
        --ic-shadow: 0 24px 80px rgba(1, 5, 14, 0.45);
        position: fixed;
        top: 12px;
        right: 12px;
        bottom: 12px;
        width: min(440px, calc(100vw - 24px));
        z-index: 2147483647;
        pointer-events: none;
      }

      #${OVERLAY_ID} * {
        box-sizing: border-box;
      }

      .ic-panel {
        width: 100%;
        height: 100%;
        display: flex;
        flex-direction: column;
        color: var(--ic-text);
        background:
          radial-gradient(circle at top left, rgba(241, 161, 111, 0.17), transparent 28%),
          radial-gradient(circle at top right, rgba(125, 170, 255, 0.12), transparent 32%),
          linear-gradient(180deg, rgba(17, 24, 36, 0.98), rgba(8, 12, 20, 0.98));
        border: 1px solid var(--ic-line);
        border-radius: 28px;
        box-shadow: var(--ic-shadow);
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        overflow: hidden;
        pointer-events: all;
        transform: translateX(108%);
        opacity: 0;
        transition:
          transform 0.42s cubic-bezier(0.16, 1, 0.3, 1),
          opacity 0.28s ease;
      }

      .ic-panel.ic-visible {
        transform: translateX(0);
        opacity: 1;
      }

      .ic-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        padding: 18px 20px 16px;
        border-bottom: 1px solid var(--ic-line);
        background: linear-gradient(180deg, rgba(255, 248, 239, 0.05), rgba(255, 248, 239, 0));
        flex-shrink: 0;
      }

      .ic-brand {
        display: flex;
        align-items: center;
        gap: 12px;
        min-width: 0;
      }

      .ic-mark {
        width: 36px;
        height: 36px;
        border-radius: 12px;
        display: grid;
        place-items: center;
        font: 700 12px/1 "Avenir Next", "Trebuchet MS", sans-serif;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: #101722;
        background: linear-gradient(135deg, #ffd7b5, #f1a16f);
        box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.4);
      }

      .ic-brand-copy {
        display: flex;
        flex-direction: column;
        min-width: 0;
      }

      .ic-brand-name {
        font: 600 13px/1.1 "Avenir Next", "Trebuchet MS", sans-serif;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        color: var(--ic-text);
      }

      .ic-brand-tag {
        margin-top: 4px;
        font: 500 11px/1.2 "Avenir Next", "Trebuchet MS", sans-serif;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--ic-dim);
      }

      .ic-close {
        width: 36px;
        height: 36px;
        border: 1px solid var(--ic-line);
        border-radius: 12px;
        display: grid;
        place-items: center;
        color: var(--ic-muted);
        background: rgba(255, 248, 239, 0.04);
        cursor: pointer;
        transition:
          transform 0.18s ease,
          background 0.18s ease,
          color 0.18s ease,
          border-color 0.18s ease;
      }

      .ic-close:hover {
        transform: translateY(-1px);
        color: var(--ic-text);
        background: rgba(255, 248, 239, 0.09);
        border-color: rgba(255, 248, 239, 0.2);
      }

      .ic-body {
        flex: 1;
        overflow-y: auto;
        padding: 18px;
        scrollbar-width: thin;
        scrollbar-color: rgba(255, 248, 239, 0.18) transparent;
      }

      .ic-body::-webkit-scrollbar {
        width: 7px;
      }

      .ic-body::-webkit-scrollbar-thumb {
        background: rgba(255, 248, 239, 0.16);
        border-radius: 999px;
      }

      .ic-content {
        display: flex;
        flex-direction: column;
        gap: 14px;
      }

      .ic-hero {
        position: relative;
        padding: 20px;
        border-radius: 24px;
        background:
          linear-gradient(180deg, rgba(255, 248, 239, 0.08), rgba(255, 248, 239, 0.03)),
          rgba(255, 248, 239, 0.03);
        border: 1px solid rgba(255, 248, 239, 0.1);
        overflow: hidden;
      }

      .ic-hero::after {
        content: "";
        position: absolute;
        top: -60px;
        right: -40px;
        width: 180px;
        height: 180px;
        border-radius: 50%;
        background: radial-gradient(circle, rgba(241, 161, 111, 0.18), transparent 70%);
        pointer-events: none;
      }

      .ic-kicker,
      .ic-label {
        font: 600 11px/1.2 "Avenir Next", "Trebuchet MS", sans-serif;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        color: var(--ic-accent);
      }

      .ic-title {
        margin: 12px 0 14px;
        font: 600 28px/1.12 "Iowan Old Style", "Palatino Linotype", "Book Antiqua", serif;
        color: var(--ic-text);
        text-wrap: balance;
      }

      .ic-standfirst {
        position: relative;
        max-width: 28ch;
        font: 500 20px/1.4 "Iowan Old Style", "Palatino Linotype", "Book Antiqua", serif;
        color: var(--ic-muted);
      }

      .ic-card {
        padding: 18px;
        border-radius: 22px;
        background: var(--ic-card);
        border: 1px solid var(--ic-line);
      }

      .ic-card-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        margin-bottom: 12px;
      }

      .ic-chip {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 7px 10px;
        border-radius: 999px;
        background: var(--ic-accent-soft);
        border: 1px solid rgba(241, 161, 111, 0.18);
        font: 600 11px/1 "Avenir Next", "Trebuchet MS", sans-serif;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        color: #ffd8bd;
        white-space: nowrap;
      }

      .ic-summary {
        font: 400 17px/1.75 "Iowan Old Style", "Palatino Linotype", "Book Antiqua", serif;
        color: var(--ic-text);
      }

      .ic-list {
        list-style: none;
        margin: 0;
        padding: 0;
        display: grid;
        gap: 12px;
      }

      .ic-list li {
        position: relative;
        padding-left: 18px;
        font: 400 16px/1.6 "Iowan Old Style", "Palatino Linotype", "Book Antiqua", serif;
        color: var(--ic-muted);
      }

      .ic-list li::before {
        content: "";
        position: absolute;
        top: 10px;
        left: 0;
        width: 7px;
        height: 7px;
        border-radius: 50%;
        background: linear-gradient(135deg, #ffd7b5, #f1a16f);
        box-shadow: 0 0 0 4px rgba(241, 161, 111, 0.14);
      }

      .ic-meta {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
      }

      .ic-meta-pill,
      .ic-meta-url {
        display: inline-flex;
        align-items: center;
        min-width: 0;
        padding: 10px 12px;
        border-radius: 999px;
        border: 1px solid var(--ic-line);
        background: rgba(255, 248, 239, 0.04);
        font: 600 11px/1.2 "Avenir Next", "Trebuchet MS", sans-serif;
        letter-spacing: 0.05em;
        text-transform: uppercase;
        color: var(--ic-dim);
      }

      .ic-meta-url {
        max-width: 100%;
        text-transform: none;
        letter-spacing: 0;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .ic-loading-copy {
        margin-top: 12px;
        font: 400 16px/1.6 "Iowan Old Style", "Palatino Linotype", "Book Antiqua", serif;
        color: var(--ic-muted);
      }

      .ic-skeleton {
        position: relative;
        overflow: hidden;
        border-radius: 999px;
        background: rgba(255, 248, 239, 0.08);
      }

      .ic-skeleton::after {
        content: "";
        position: absolute;
        inset: 0;
        transform: translateX(-100%);
        background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.14), transparent);
        animation: ic-shimmer 1.4s infinite;
      }

      .ic-skeleton-title {
        width: 72%;
        height: 16px;
      }

      .ic-skeleton-standfirst {
        width: 100%;
        height: 68px;
        border-radius: 18px;
        margin-top: 14px;
      }

      .ic-skeleton-line {
        height: 12px;
        margin-top: 12px;
      }

      .ic-skeleton-line.short {
        width: 72%;
      }

      .ic-status {
        padding: 18px;
        border-radius: 22px;
        border: 1px solid var(--ic-line);
        background: linear-gradient(180deg, rgba(255, 248, 239, 0.07), rgba(255, 248, 239, 0.03));
      }

      .ic-status-title {
        margin: 8px 0 10px;
        font: 600 22px/1.2 "Iowan Old Style", "Palatino Linotype", "Book Antiqua", serif;
        color: var(--ic-text);
      }

      .ic-status-copy {
        font: 400 16px/1.65 "Iowan Old Style", "Palatino Linotype", "Book Antiqua", serif;
        color: var(--ic-muted);
      }

      @keyframes ic-shimmer {
        100% {
          transform: translateX(100%);
        }
      }

      @media (max-width: 768px) {
        #${OVERLAY_ID} {
          top: auto;
          left: 10px;
          right: 10px;
          bottom: 10px;
          width: auto;
          height: min(78vh, 620px);
        }

        .ic-panel {
          transform: translateY(108%);
        }

        .ic-panel.ic-visible {
          transform: translateY(0);
        }

        .ic-title {
          font-size: 24px;
        }

        .ic-standfirst {
          font-size: 18px;
        }

        .ic-card-head {
          flex-direction: column;
          align-items: flex-start;
        }
      }
    `;

    (document.head || document.documentElement).appendChild(style);
  }

  show(): void {
    if (this.isVisible) {
      return;
    }

    this.isVisible = true;
    requestAnimationFrame(() => {
      this.panel.classList.add("ic-visible");
    });
  }

  hide(): void {
    this.isVisible = false;
    this.panel.classList.remove("ic-visible");
  }

  toggle(): void {
    this.isVisible ? this.hide() : this.show();
  }

  setState(state: OverlayState, data?: OverlayData): void {
    const content = this.panel.querySelector(".ic-content")!;

    switch (state) {
      case "loading":
        content.innerHTML = `
          <div class="ic-hero">
            <p class="ic-kicker">Reading brief</p>
            <div class="ic-skeleton ic-skeleton-title"></div>
            <div class="ic-skeleton ic-skeleton-standfirst"></div>
          </div>
          <div class="ic-card">
            <p class="ic-label">Analyzing page</p>
            <p class="ic-loading-copy">Pulling the article into a tighter brief with the key ideas, details, and source context.</p>
            <div class="ic-skeleton ic-skeleton-line"></div>
            <div class="ic-skeleton ic-skeleton-line"></div>
            <div class="ic-skeleton ic-skeleton-line short"></div>
          </div>
        `;
        break;

      case "success":
        content.innerHTML = this.renderSuccessState(data);
        break;

      case "error":
        content.innerHTML = this.renderStatusState(
          "Connection issue",
          data?.error || "Something went wrong while generating the brief."
        );
        break;

      case "no-content":
        content.innerHTML = this.renderStatusState(
          "No readable article",
          "This page does not look like a readable article yet, so there was not enough clean text to summarize."
        );
        break;
    }
  }

  private renderSuccessState(data?: OverlayData): string {
    const title = this.escapeHtml(data?.title || document.title || "Untitled article");
    const standfirst = this.escapeHtml(data?.standfirst || data?.summary || "");
    const summary = this.escapeHtml(data?.summary || "");
    const bullets = Array.isArray(data?.bullets) ? data?.bullets : [];
    const modelLabel = this.escapeHtml(this.formatModel(data?.model));
    const sourceHost = this.escapeHtml(this.getSourceHost());
    const sourcePath = this.escapeHtml(this.getSourcePath());

    return `
      <div class="ic-hero">
        <p class="ic-kicker">Reading brief</p>
        <h2 class="ic-title">${title}</h2>
        <p class="ic-standfirst">${standfirst}</p>
      </div>

      <section class="ic-card">
        <div class="ic-card-head">
          <p class="ic-label">In short</p>
          <span class="ic-chip">${modelLabel}</span>
        </div>
        <p class="ic-summary">${summary}</p>
      </section>

      <section class="ic-card">
        <p class="ic-label">Key points</p>
        <ul class="ic-list">${this.renderBullets(bullets)}</ul>
      </section>

      <div class="ic-meta">
        <span class="ic-meta-pill">Source ${sourceHost}</span>
        <span class="ic-meta-url">${sourcePath}</span>
      </div>
    `;
  }

  private renderStatusState(title: string, copy: string): string {
    return `
      <div class="ic-status">
        <p class="ic-kicker">Internet Companion</p>
        <h2 class="ic-status-title">${this.escapeHtml(title)}</h2>
        <p class="ic-status-copy">${this.escapeHtml(copy)}</p>
      </div>
    `;
  }

  private renderBullets(bullets: string[]): string {
    const safeBullets =
      bullets.length > 0 ? bullets : ["No key details were available for this page."];

    return safeBullets
      .map((bullet) => `<li>${this.escapeHtml(bullet)}</li>`)
      .join("");
  }

  private formatModel(model?: string): string {
    if (!model || model === "extractive-fallback") {
      return "Fallback brief";
    }

    return `OpenAI ${model}`;
  }

  private getSourceHost(): string {
    try {
      return new URL(window.location.href).hostname.replace(/^www\./, "");
    } catch {
      return "source";
    }
  }

  private getSourcePath(): string {
    try {
      const url = new URL(window.location.href);
      const path = `${url.pathname}${url.search}` || "/";
      return path.length > 56 ? `${path.slice(0, 55)}...` : path;
    } catch {
      return window.location.href;
    }
  }

  private escapeHtml(str: string): string {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }
}
