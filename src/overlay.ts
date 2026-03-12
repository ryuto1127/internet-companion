const OVERLAY_ID = "ic-overlay-root";

type OverlayState = "loading" | "success" | "error" | "no-content";

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
    if (existing) existing.remove();

    const root = document.createElement("div");
    root.id = OVERLAY_ID;
    return root;
  }

  private createPanel(): HTMLElement {
    const panel = document.createElement("div");
    panel.className = "ic-panel";
    panel.innerHTML = `
      <div class="ic-header">
        <span class="ic-logo">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="7" stroke="currentColor" stroke-width="1.5"/>
            <path d="M5 8h6M8 5v6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
          Internet Companion
        </span>
        <button class="ic-close" aria-label="Close">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
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
    const style = document.createElement("style");
    style.textContent = `
      #${OVERLAY_ID} {
        position: fixed;
        top: 0;
        right: 0;
        height: 100vh;
        z-index: 2147483647;
        font-family: 'Georgia', 'Times New Roman', serif;
        pointer-events: none;
      }

      #${OVERLAY_ID} * {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
      }

      .ic-panel {
        position: relative;
        width: 340px;
        height: 100%;
        background: #0f0f0f;
        color: #e8e4dc;
        border-left: 1px solid #2a2a2a;
        display: flex;
        flex-direction: column;
        transform: translateX(100%);
        transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1);
        pointer-events: all;
        overflow: hidden;
      }

      .ic-panel.ic-visible {
        transform: translateX(0);
      }

      .ic-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 16px 20px;
        border-bottom: 1px solid #1e1e1e;
        flex-shrink: 0;
      }

      .ic-logo {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 11px;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: #666;
        font-family: 'Courier New', monospace;
      }

      .ic-close {
        background: none;
        border: none;
        color: #444;
        cursor: pointer;
        padding: 4px;
        display: flex;
        align-items: center;
        transition: color 0.15s;
        border-radius: 3px;
      }

      .ic-close:hover {
        color: #e8e4dc;
      }

      .ic-body {
        flex: 1;
        overflow-y: auto;
        padding: 24px 20px;
        scrollbar-width: thin;
        scrollbar-color: #2a2a2a #0f0f0f;
      }

      .ic-body::-webkit-scrollbar {
        width: 4px;
      }

      .ic-body::-webkit-scrollbar-track {
        background: #0f0f0f;
      }

      .ic-body::-webkit-scrollbar-thumb {
        background: #2a2a2a;
        border-radius: 2px;
      }

      .ic-content {
        line-height: 1.7;
      }

      /* Loading state */
      .ic-loading {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .ic-label {
        font-family: 'Courier New', monospace;
        font-size: 10px;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        color: #444;
        margin-bottom: 4px;
      }

      .ic-spinner {
        display: flex;
        align-items: center;
        gap: 10px;
        color: #555;
        font-size: 13px;
        font-family: 'Courier New', monospace;
      }

      .ic-dots {
        display: flex;
        gap: 4px;
      }

      .ic-dot {
        width: 4px;
        height: 4px;
        background: #555;
        border-radius: 50%;
        animation: ic-pulse 1.2s ease-in-out infinite;
      }

      .ic-dot:nth-child(2) { animation-delay: 0.2s; }
      .ic-dot:nth-child(3) { animation-delay: 0.4s; }

      @keyframes ic-pulse {
        0%, 80%, 100% { opacity: 0.2; transform: scale(0.8); }
        40% { opacity: 1; transform: scale(1); }
      }

      /* Summary */
      .ic-summary-label {
        font-family: 'Courier New', monospace;
        font-size: 10px;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        color: #444;
        margin-bottom: 16px;
      }

      .ic-summary-text {
        font-size: 15px;
        line-height: 1.75;
        color: #c8c4bc;
        font-weight: 400;
      }

      .ic-divider {
        width: 24px;
        height: 1px;
        background: #2a2a2a;
        margin: 20px 0;
      }

      .ic-url {
        font-family: 'Courier New', monospace;
        font-size: 10px;
        color: #333;
        word-break: break-all;
        line-height: 1.5;
      }

      /* Error state */
      .ic-error {
        color: #7a3f3f;
        font-size: 13px;
        font-family: 'Courier New', monospace;
        line-height: 1.6;
      }

      .ic-error-icon {
        font-size: 20px;
        margin-bottom: 12px;
        display: block;
      }

      /* No content state */
      .ic-empty {
        color: #444;
        font-size: 13px;
        font-family: 'Courier New', monospace;
        line-height: 1.6;
      }

      .ic-empty-icon {
        font-size: 20px;
        margin-bottom: 12px;
        display: block;
        opacity: 0.4;
      }
    `;
    document.head.appendChild(style);
  }

  show(): void {
    if (this.isVisible) return;
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

  setState(state: OverlayState, data?: { summary?: string; error?: string }): void {
    const content = this.panel.querySelector(".ic-content")!;

    switch (state) {
      case "loading":
        content.innerHTML = `
          <div class="ic-loading">
            <div class="ic-spinner">
              <div class="ic-dots">
                <div class="ic-dot"></div>
                <div class="ic-dot"></div>
                <div class="ic-dot"></div>
              </div>
              Analyzing
            </div>
          </div>
        `;
        break;

      case "success":
        content.innerHTML = `
          <p class="ic-summary-label">Summary</p>
          <p class="ic-summary-text">${this.escapeHtml(data?.summary ?? "")}</p>
          <div class="ic-divider"></div>
          <p class="ic-url">${this.escapeHtml(window.location.href)}</p>
        `;
        break;

      case "error":
        content.innerHTML = `
          <div class="ic-error">
            <span class="ic-error-icon">⚠</span>
            ${this.escapeHtml(data?.error ?? "Something went wrong.")}
          </div>
        `;
        break;

      case "no-content":
        content.innerHTML = `
          <div class="ic-empty">
            <span class="ic-empty-icon">◎</span>
            No readable content found on this page.
          </div>
        `;
        break;
    }
  }

  private escapeHtml(str: string): string {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
}
