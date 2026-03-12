import type {
  CompanionPagePayload,
  CredibilityLevel,
  PageAnswer,
  PageDeepDive,
  PageSummary,
} from "./types";

const OVERLAY_ID = "ic-overlay-root";
const STYLE_ID = "ic-overlay-style";
const PAGE_SHIFT_CLASS = "ic-page-shifted";
const MOBILE_BREAKPOINT = 768;
const PANEL_WIDTH = 320;
const PANEL_GAP = 24;

interface OverlayCallbacks {
  onAsk: (question: string) => void;
  onDeepDive: () => void;
}

interface ReadyViewState {
  page: CompanionPagePayload;
  summary: PageSummary;
  questionDraft: string;
  questionLoading: boolean;
  questionError?: string;
  questionPrompt?: string;
  questionResult?: PageAnswer;
  deepDiveLoading: boolean;
  deepDiveError?: string;
  deepDive?: PageDeepDive;
}

type ViewState =
  | { kind: "loading"; title?: string }
  | { kind: "error"; error: string }
  | { kind: "no-content"; message: string }
  | { kind: "ready"; data: ReadyViewState };

export class Overlay {
  private root: HTMLElement;
  private panel: HTMLElement;
  private isVisible = false;
  private state: ViewState = { kind: "loading" };
  private readonly callbacks: OverlayCallbacks;
  private readonly handleResize = (): void => {
    if (this.isVisible) {
      this.applyPageInset();
    }
  };

  constructor(callbacks: OverlayCallbacks) {
    this.callbacks = callbacks;
    this.root = this.createRoot();
    this.panel = this.createPanel();
    this.root.appendChild(this.panel);
    document.body.appendChild(this.root);
    this.injectStyles();
    this.render();
    window.addEventListener("resize", this.handleResize, { passive: true });
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
            <span class="ic-brand-tag">AI browsing companion</span>
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
      html.${PAGE_SHIFT_CLASS} {
        overflow-x: hidden !important;
        scroll-padding-right: var(--ic-page-offset, 0px) !important;
      }

      body.${PAGE_SHIFT_CLASS} {
        box-sizing: border-box !important;
        max-width: 100vw !important;
        padding-right: var(--ic-page-offset, 0px) !important;
        transition: padding-right 0.28s ease !important;
      }

      #${OVERLAY_ID} {
        --ic-line: rgba(255, 247, 236, 0.12);
        --ic-text: #f7efe5;
        --ic-muted: #d4c7b7;
        --ic-dim: #8e99ab;
        --ic-accent: #f1a16f;
        --ic-accent-soft: rgba(241, 161, 111, 0.18);
        --ic-unknown: #8ea8c7;
        --ic-medium: #f1c06f;
        --ic-high: #74d3a0;
        --ic-shadow: 0 24px 80px rgba(1, 5, 14, 0.45);
        position: fixed;
        top: 14px;
        right: 14px;
        bottom: 14px;
        width: min(${PANEL_WIDTH}px, calc(100vw - 28px));
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
          radial-gradient(circle at top left, rgba(241, 161, 111, 0.14), transparent 30%),
          radial-gradient(circle at top right, rgba(125, 170, 255, 0.1), transparent 34%),
          linear-gradient(180deg, rgba(17, 24, 36, 0.985), rgba(8, 12, 20, 0.985));
        border: 1px solid var(--ic-line);
        border-radius: 24px;
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
        gap: 14px;
        padding: 15px 15px 13px;
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
        width: 34px;
        height: 34px;
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
        font: 600 12px/1.1 "Avenir Next", "Trebuchet MS", sans-serif;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--ic-text);
      }

      .ic-brand-tag {
        margin-top: 4px;
        font: 500 10px/1.2 "Avenir Next", "Trebuchet MS", sans-serif;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        color: var(--ic-dim);
      }

      .ic-close {
        width: 34px;
        height: 34px;
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
        padding: 13px;
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
        gap: 12px;
      }

      .ic-hero,
      .ic-card,
      .ic-status {
        border: 1px solid var(--ic-line);
        background: rgba(255, 248, 239, 0.05);
      }

      .ic-hero {
        position: relative;
        padding: 15px;
        border-radius: 20px;
        background:
          linear-gradient(180deg, rgba(255, 248, 239, 0.07), rgba(255, 248, 239, 0.03)),
          rgba(255, 248, 239, 0.03);
        overflow: hidden;
      }

      .ic-hero::after {
        content: "";
        position: absolute;
        top: -56px;
        right: -34px;
        width: 150px;
        height: 150px;
        border-radius: 50%;
        background: radial-gradient(circle, rgba(241, 161, 111, 0.14), transparent 70%);
        pointer-events: none;
      }

      .ic-chip-row {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }

      .ic-chip {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        min-height: 28px;
        padding: 7px 10px;
        border-radius: 999px;
        border: 1px solid rgba(255, 248, 239, 0.16);
        background: rgba(255, 248, 239, 0.06);
        font: 600 10px/1 "Avenir Next", "Trebuchet MS", sans-serif;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--ic-muted);
      }

      .ic-chip--context {
        color: #ffd8bd;
        background: var(--ic-accent-soft);
        border-color: rgba(241, 161, 111, 0.2);
      }

      .ic-chip--high {
        color: var(--ic-high);
      }

      .ic-chip--medium {
        color: var(--ic-medium);
      }

      .ic-chip--unknown {
        color: var(--ic-unknown);
      }

      .ic-title {
        margin: 12px 0 12px;
        font: 600 22px/1.12 "Iowan Old Style", "Palatino Linotype", "Book Antiqua", serif;
        color: var(--ic-text);
        text-wrap: balance;
      }

      .ic-standfirst {
        margin: 0;
        font: 500 16px/1.45 "Iowan Old Style", "Palatino Linotype", "Book Antiqua", serif;
        color: var(--ic-muted);
      }

      .ic-rationale {
        margin: 12px 0 0;
        font: 400 12px/1.55 "Avenir Next", "Trebuchet MS", sans-serif;
        color: var(--ic-dim);
      }

      .ic-card,
      .ic-status {
        padding: 14px;
        border-radius: 18px;
      }

      .ic-card-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        margin-bottom: 10px;
      }

      .ic-label,
      .ic-mini-label {
        font: 600 10px/1.25 "Avenir Next", "Trebuchet MS", sans-serif;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        color: var(--ic-accent);
      }

      .ic-mini-label {
        color: var(--ic-dim);
      }

      .ic-model-pill {
        display: inline-flex;
        align-items: center;
        padding: 6px 9px;
        border-radius: 999px;
        border: 1px solid rgba(255, 248, 239, 0.16);
        background: rgba(255, 248, 239, 0.05);
        font: 600 10px/1 "Avenir Next", "Trebuchet MS", sans-serif;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        color: var(--ic-dim);
      }

      .ic-summary,
      .ic-answer-copy,
      .ic-note {
        font: 400 14px/1.65 "Iowan Old Style", "Palatino Linotype", "Book Antiqua", serif;
        color: var(--ic-text);
      }

      .ic-note {
        color: var(--ic-muted);
      }

      .ic-subcard,
      .ic-answer,
      .ic-inline-status,
      .ic-deep-dive-grid section {
        margin-top: 12px;
        padding: 12px;
        border-radius: 14px;
        border: 1px solid rgba(255, 248, 239, 0.1);
        background: rgba(255, 248, 239, 0.04);
      }

      .ic-list {
        list-style: none;
        margin: 0;
        padding: 0;
        display: grid;
        gap: 10px;
      }

      .ic-list li {
        position: relative;
        padding-left: 16px;
        font: 400 13px/1.58 "Iowan Old Style", "Palatino Linotype", "Book Antiqua", serif;
        color: var(--ic-muted);
      }

      .ic-list li::before {
        content: "";
        position: absolute;
        top: 8px;
        left: 0;
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: linear-gradient(135deg, #ffd7b5, #f1a16f);
        box-shadow: 0 0 0 4px rgba(241, 161, 111, 0.12);
      }

      .ic-ask-form {
        display: grid;
        gap: 10px;
      }

      .ic-ask-input {
        width: 100%;
        min-height: 88px;
        resize: vertical;
        border: 1px solid rgba(255, 248, 239, 0.14);
        border-radius: 14px;
        padding: 12px 13px;
        background: rgba(5, 9, 16, 0.32);
        color: var(--ic-text);
        font: 400 13px/1.5 "Avenir Next", "Trebuchet MS", sans-serif;
        outline: none;
        transition: border-color 0.18s ease, box-shadow 0.18s ease;
      }

      .ic-ask-input:focus {
        border-color: rgba(241, 161, 111, 0.45);
        box-shadow: 0 0 0 3px rgba(241, 161, 111, 0.12);
      }

      .ic-ask-input::placeholder {
        color: #738094;
      }

      .ic-button-row {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
      }

      .ic-button,
      .ic-secondary-button {
        border: none;
        border-radius: 999px;
        padding: 10px 12px;
        cursor: pointer;
        font: 600 10px/1 "Avenir Next", "Trebuchet MS", sans-serif;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        transition: transform 0.18s ease, opacity 0.18s ease, background 0.18s ease;
      }

      .ic-button {
        color: #112030;
        background: linear-gradient(135deg, #ffd6b2, #f1a16f);
      }

      .ic-secondary-button {
        color: var(--ic-text);
        background: rgba(255, 248, 239, 0.08);
        border: 1px solid rgba(255, 248, 239, 0.14);
      }

      .ic-button:hover,
      .ic-secondary-button:hover {
        transform: translateY(-1px);
      }

      .ic-button:disabled,
      .ic-secondary-button:disabled {
        opacity: 0.6;
        cursor: wait;
        transform: none;
      }

      .ic-error-text {
        margin-top: 10px;
        font: 500 12px/1.5 "Avenir Next", "Trebuchet MS", sans-serif;
        color: #f5a6a6;
      }

      .ic-followups {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-top: 10px;
      }

      .ic-followup {
        padding: 8px 10px;
        border-radius: 999px;
        border: 1px solid rgba(255, 248, 239, 0.12);
        background: rgba(255, 248, 239, 0.04);
        font: 500 11px/1.35 "Avenir Next", "Trebuchet MS", sans-serif;
        color: var(--ic-dim);
      }

      .ic-deep-dive-grid {
        display: grid;
        gap: 10px;
        margin-top: 12px;
      }

      .ic-tags {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }

      .ic-tag {
        padding: 8px 10px;
        border-radius: 999px;
        background: rgba(255, 248, 239, 0.05);
        border: 1px solid rgba(255, 248, 239, 0.12);
        font: 600 11px/1 "Avenir Next", "Trebuchet MS", sans-serif;
        color: var(--ic-muted);
      }

      .ic-meta {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }

      .ic-meta-pill {
        display: inline-flex;
        align-items: center;
        min-width: 0;
        padding: 9px 10px;
        border-radius: 999px;
        border: 1px solid var(--ic-line);
        background: rgba(255, 248, 239, 0.04);
        font: 600 10px/1.25 "Avenir Next", "Trebuchet MS", sans-serif;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        color: var(--ic-dim);
      }

      .ic-meta-pill--path {
        text-transform: none;
        letter-spacing: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 100%;
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
        width: 74%;
        height: 16px;
      }

      .ic-skeleton-copy {
        height: 12px;
        margin-top: 12px;
      }

      .ic-skeleton-copy.short {
        width: 68%;
      }

      .ic-status-title {
        margin: 8px 0 10px;
        font: 600 19px/1.2 "Iowan Old Style", "Palatino Linotype", "Book Antiqua", serif;
        color: var(--ic-text);
      }

      .ic-status-copy {
        font: 400 14px/1.58 "Iowan Old Style", "Palatino Linotype", "Book Antiqua", serif;
        color: var(--ic-muted);
      }

      @keyframes ic-shimmer {
        100% {
          transform: translateX(100%);
        }
      }

      @media (max-width: 768px) {
        body.${PAGE_SHIFT_CLASS} {
          padding-right: 0 !important;
        }

        #${OVERLAY_ID} {
          top: auto;
          left: 10px;
          right: 10px;
          bottom: 10px;
          width: auto;
          height: min(82vh, 680px);
        }

        .ic-panel {
          transform: translateY(108%);
        }

        .ic-panel.ic-visible {
          transform: translateY(0);
        }

        .ic-card-head {
          flex-direction: column;
          align-items: flex-start;
        }
      }
    `;

    (document.head || document.documentElement).appendChild(style);
  }

  private getPageInset(): number {
    if (window.innerWidth <= MOBILE_BREAKPOINT) {
      return 0;
    }

    return PANEL_WIDTH + PANEL_GAP;
  }

  private applyPageInset(): void {
    const inset = this.getPageInset();

    if (inset <= 0) {
      this.removePageInset();
      return;
    }

    document.documentElement.style.setProperty("--ic-page-offset", `${inset}px`);
    document.body.style.setProperty("--ic-page-offset", `${inset}px`);
    document.documentElement.classList.add(PAGE_SHIFT_CLASS);
    document.body.classList.add(PAGE_SHIFT_CLASS);
  }

  private removePageInset(): void {
    document.documentElement.classList.remove(PAGE_SHIFT_CLASS);
    document.body.classList.remove(PAGE_SHIFT_CLASS);
    document.documentElement.style.removeProperty("--ic-page-offset");
    document.body.style.removeProperty("--ic-page-offset");
  }

  show(): void {
    if (this.isVisible) {
      return;
    }

    this.isVisible = true;
    this.applyPageInset();
    requestAnimationFrame(() => {
      this.panel.classList.add("ic-visible");
    });
  }

  hide(): void {
    if (!this.isVisible) {
      return;
    }

    this.isVisible = false;
    this.panel.classList.remove("ic-visible");
    this.removePageInset();
  }

  setLoading(title?: string): void {
    this.state = { kind: "loading", title };
    this.render();
  }

  setError(error: string): void {
    this.state = { kind: "error", error };
    this.render();
  }

  setNoContent(
    message = "This page does not look like a readable article yet, so there was not enough clean text to analyze."
  ): void {
    this.state = { kind: "no-content", message };
    this.render();
  }

  setReady(page: CompanionPagePayload, summary: PageSummary): void {
    this.state = {
      kind: "ready",
      data: {
        page,
        summary,
        questionDraft: "",
        questionLoading: false,
        deepDiveLoading: false,
      },
    };
    this.render();
  }

  setQuestionLoading(question: string): void {
    const data = this.getReadyState();
    if (!data) {
      return;
    }

    data.questionDraft = question;
    data.questionPrompt = question;
    data.questionLoading = true;
    data.questionError = undefined;
    this.render();
  }

  setQuestionResult(question: string, result: PageAnswer): void {
    const data = this.getReadyState();
    if (!data) {
      return;
    }

    data.questionDraft = question;
    data.questionPrompt = question;
    data.questionLoading = false;
    data.questionError = undefined;
    data.questionResult = result;
    this.render();
  }

  setQuestionError(question: string, error: string): void {
    const data = this.getReadyState();
    if (!data) {
      return;
    }

    data.questionDraft = question;
    data.questionPrompt = question;
    data.questionLoading = false;
    data.questionError = error;
    this.render();
  }

  setDeepDiveLoading(): void {
    const data = this.getReadyState();
    if (!data) {
      return;
    }

    data.deepDiveLoading = true;
    data.deepDiveError = undefined;
    this.render();
  }

  setDeepDiveResult(result: PageDeepDive): void {
    const data = this.getReadyState();
    if (!data) {
      return;
    }

    data.deepDiveLoading = false;
    data.deepDiveError = undefined;
    data.deepDive = result;
    this.render();
  }

  setDeepDiveError(error: string): void {
    const data = this.getReadyState();
    if (!data) {
      return;
    }

    data.deepDiveLoading = false;
    data.deepDiveError = error;
    this.render();
  }

  private getReadyState(): ReadyViewState | null {
    return this.state.kind === "ready" ? this.state.data : null;
  }

  private render(): void {
    const content = this.panel.querySelector(".ic-content")!;

    switch (this.state.kind) {
      case "loading":
        content.innerHTML = this.renderLoadingState(this.state.title);
        break;
      case "error":
        content.innerHTML = this.renderStatusState(
          "Connection issue",
          this.state.error
        );
        break;
      case "no-content":
        content.innerHTML = this.renderStatusState(
          "No readable article",
          this.state.message
        );
        break;
      case "ready":
        content.innerHTML = this.renderReadyState(this.state.data);
        this.bindInteractiveElements();
        break;
    }
  }

  private bindInteractiveElements(): void {
    const readyState = this.getReadyState();
    if (!readyState) {
      return;
    }

    const form = this.panel.querySelector(".ic-ask-form");
    const input = this.panel.querySelector(".ic-ask-input") as HTMLTextAreaElement | null;
    const deepDiveButton = this.panel.querySelector(".ic-deep-dive-button");

    form?.addEventListener("submit", (event) => {
      event.preventDefault();

      const question = input?.value.trim() || "";
      if (!question || readyState.questionLoading) {
        return;
      }

      this.callbacks.onAsk(question);
    });

    input?.addEventListener("input", () => {
      const data = this.getReadyState();
      if (!data) {
        return;
      }

      data.questionDraft = input.value;
    });

    deepDiveButton?.addEventListener("click", () => {
      const data = this.getReadyState();
      if (!data || data.deepDiveLoading) {
        return;
      }

      this.callbacks.onDeepDive();
    });
  }

  private renderLoadingState(title?: string): string {
    return `
      <div class="ic-hero">
        <div class="ic-chip-row">
          <span class="ic-chip ic-chip--context">Analyzing page</span>
        </div>
        ${
          title
            ? `<h2 class="ic-title">${this.escapeHtml(title)}</h2>`
            : `<div class="ic-skeleton ic-skeleton-title"></div>`
        }
        <div class="ic-skeleton ic-skeleton-copy"></div>
        <div class="ic-skeleton ic-skeleton-copy"></div>
        <div class="ic-skeleton ic-skeleton-copy short"></div>
      </div>
      <div class="ic-card">
        <p class="ic-label">Working</p>
        <p class="ic-note">Detecting the kind of page, summarizing the content, and preparing deeper context for follow-up questions.</p>
      </div>
    `;
  }

  private renderReadyState(data: ReadyViewState): string {
    const { page, summary } = data;
    const questionPlaceholder = this.getQuestionPlaceholder(page.context.kind);

    return `
      <div class="ic-hero">
        <div class="ic-chip-row">
          <span class="ic-chip ic-chip--context">${this.escapeHtml(page.context.label)}</span>
          <span class="ic-chip ${this.getCredibilityClass(page.credibility.level)}">${this.escapeHtml(page.credibility.label)}</span>
        </div>
        <h2 class="ic-title">${this.escapeHtml(page.title || "Untitled page")}</h2>
        <p class="ic-standfirst">${this.escapeHtml(summary.standfirst)}</p>
        <p class="ic-rationale">${this.escapeHtml(page.credibility.rationale)}</p>
      </div>

      <section class="ic-card">
        <div class="ic-card-head">
          <p class="ic-label">In short</p>
          <span class="ic-model-pill">${this.escapeHtml(this.formatModel(summary.model))}</span>
        </div>
        <p class="ic-summary">${this.escapeHtml(summary.summary)}</p>
        <div class="ic-subcard">
          <p class="ic-mini-label">Context</p>
          <p class="ic-note">${this.escapeHtml(summary.background)}</p>
        </div>
      </section>

      <section class="ic-card">
        <p class="ic-label">Key points</p>
        <ul class="ic-list">${this.renderListItems(summary.bullets)}</ul>
      </section>

      <section class="ic-card">
        <p class="ic-label">Ask AI About This Page</p>
        <form class="ic-ask-form">
          <textarea class="ic-ask-input" placeholder="${this.escapeHtml(questionPlaceholder)}">${this.escapeHtml(data.questionDraft)}</textarea>
          <div class="ic-button-row">
            <button class="ic-button" type="submit" ${data.questionLoading ? "disabled" : ""}>
              ${data.questionLoading ? "Answering..." : "Ask"}
            </button>
          </div>
        </form>
        ${
          data.questionError
            ? `<p class="ic-error-text">${this.escapeHtml(data.questionError)}</p>`
            : ""
        }
        ${this.renderQuestionResult(data)}
      </section>

      <section class="ic-card">
        <div class="ic-card-head">
          <p class="ic-label">Deep Dive</p>
          <button class="ic-secondary-button ic-deep-dive-button" type="button" ${data.deepDiveLoading ? "disabled" : ""}>
            ${data.deepDiveLoading ? "Loading..." : "Deep Dive"}
          </button>
        </div>
        <p class="ic-note">Explore the topic beyond the current page with more context, related ideas, and alternative angles.</p>
        ${
          data.deepDiveError
            ? `<p class="ic-error-text">${this.escapeHtml(data.deepDiveError)}</p>`
            : ""
        }
        ${this.renderDeepDive(data)}
      </section>

      <div class="ic-meta">
        <span class="ic-meta-pill">Source ${this.escapeHtml(page.credibility.host)}</span>
        <span class="ic-meta-pill">${this.escapeHtml(page.credibility.sourceType)}</span>
        <span class="ic-meta-pill ic-meta-pill--path">${this.escapeHtml(this.getSourcePath())}</span>
      </div>
    `;
  }

  private renderQuestionResult(data: ReadyViewState): string {
    if (data.questionLoading) {
      return `
        <div class="ic-inline-status">
          <p class="ic-mini-label">Answering</p>
          <p class="ic-note">Reading the page against your question and generating a grounded answer.</p>
        </div>
      `;
    }

    if (!data.questionResult || !data.questionPrompt) {
      return "";
    }

    return `
      <div class="ic-answer">
        <p class="ic-mini-label">Question</p>
        <p class="ic-note">${this.escapeHtml(data.questionPrompt)}</p>
        <p class="ic-mini-label" style="margin-top: 10px;">Answer</p>
        <p class="ic-answer-copy">${this.escapeHtml(data.questionResult.answer)}</p>
        ${
          data.questionResult.followUps.length > 0
            ? `
              <div class="ic-followups">
                ${data.questionResult.followUps
                  .map(
                    (followUp) =>
                      `<span class="ic-followup">${this.escapeHtml(followUp)}</span>`
                  )
                  .join("")}
              </div>
            `
            : ""
        }
      </div>
    `;
  }

  private renderDeepDive(data: ReadyViewState): string {
    if (data.deepDiveLoading) {
      return `
        <div class="ic-inline-status">
          <p class="ic-mini-label">Thinking deeper</p>
          <p class="ic-note">Pulling together background, related topics, and competing frames around this page.</p>
        </div>
      `;
    }

    if (!data.deepDive) {
      return "";
    }

    return `
      <div class="ic-deep-dive-grid">
        <section>
          <p class="ic-mini-label">Key insights</p>
          <ul class="ic-list">${this.renderListItems(data.deepDive.insights)}</ul>
        </section>
        <section>
          <p class="ic-mini-label">Background</p>
          <ul class="ic-list">${this.renderListItems(data.deepDive.background)}</ul>
        </section>
        <section>
          <p class="ic-mini-label">Opposing viewpoints</p>
          <ul class="ic-list">${this.renderListItems(data.deepDive.opposingViewpoints)}</ul>
        </section>
        <section>
          <p class="ic-mini-label">Related topics</p>
          <div class="ic-tags">
            ${data.deepDive.relatedTopics
              .map((topic) => `<span class="ic-tag">${this.escapeHtml(topic)}</span>`)
              .join("")}
          </div>
        </section>
      </div>
    `;
  }

  private renderStatusState(title: string, copy: string): string {
    return `
      <div class="ic-status">
        <p class="ic-label">Internet Companion</p>
        <h2 class="ic-status-title">${this.escapeHtml(title)}</h2>
        <p class="ic-status-copy">${this.escapeHtml(copy)}</p>
      </div>
    `;
  }

  private renderListItems(items: string[]): string {
    const safeItems = items.length > 0 ? items : ["No details were available."];

    return safeItems
      .map((item) => `<li>${this.escapeHtml(item)}</li>`)
      .join("");
  }

  private getQuestionPlaceholder(kind: CompanionPagePayload["context"]["kind"]): string {
    switch (kind) {
      case "news":
        return "What is the main development here, and why does it matter?";
      case "wikipedia":
        return "Explain this topic in simpler terms.";
      default:
        return "Ask anything about this page.";
    }
  }

  private getCredibilityClass(level: CredibilityLevel): string {
    return `ic-chip--${level}`;
  }

  private formatModel(model?: string): string {
    if (!model || model === "extractive-fallback") {
      return "Basic mode";
    }

    return `OpenAI ${model}`;
  }

  private getSourcePath(): string {
    try {
      const url = new URL(window.location.href);
      const path = `${url.pathname}${url.search}` || "/";
      return path.length > 44 ? `${path.slice(0, 43)}...` : path;
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
