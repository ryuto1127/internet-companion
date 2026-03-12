import type { ExtractedContent } from "./extractor";
import type { PageContext } from "./types";

const NEWS_HOSTS = new Set([
  "apnews.com",
  "bbc.com",
  "bloomberg.com",
  "cnn.com",
  "economist.com",
  "ft.com",
  "npr.org",
  "nytimes.com",
  "reuters.com",
  "theatlantic.com",
  "theguardian.com",
  "washingtonpost.com",
  "wsj.com",
]);

export function detectPageContext(
  pageUrl: string,
  doc: Document,
  extracted: ExtractedContent
): PageContext {
  const url = safeParseUrl(pageUrl);
  const host = url?.hostname.replace(/^www\./, "") || "";

  if (host.endsWith("wikipedia.org") || url?.pathname.startsWith("/wiki/")) {
    return {
      kind: "wikipedia",
      label: "Wikipedia",
      sourceType: "encyclopedia",
      promptHint:
        "Explain the concept in simpler terms and call out the key figures, dates, or events a reader should remember.",
    };
  }

  if (isNewsLikePage(host, doc, extracted)) {
    return {
      kind: "news",
      label: "News Article",
      sourceType: NEWS_HOSTS.has(host) ? "major-news" : "news-article",
      promptHint:
        "Summarize the key points, explain the background context, and make the current development easy to follow.",
    };
  }

  return {
    kind: "general",
    label: "General Page",
    sourceType: "general-web",
    promptHint:
      "Summarize the main ideas, explain what matters most, and keep the response grounded in the page itself.",
  };
}

function isNewsLikePage(
  host: string,
  doc: Document,
  extracted: ExtractedContent
): boolean {
  if (NEWS_HOSTS.has(host)) {
    return true;
  }

  const metaOgType =
    doc
      .querySelector('meta[property="og:type"]')
      ?.getAttribute("content")
      ?.toLowerCase() || "";
  const parselyType =
    doc
      .querySelector('meta[name="parsely-type"]')
      ?.getAttribute("content")
      ?.toLowerCase() || "";
  const hasArticleTag = Boolean(doc.querySelector("article"));
  const hasTimeTag = Boolean(
    doc.querySelector(
      'time, meta[property="article:published_time"], meta[name="article:published_time"]'
    )
  );
  const longRead = extracted.text.length > 2200;

  return (
    metaOgType === "article" ||
    parselyType === "post" ||
    (hasArticleTag && hasTimeTag) ||
    (hasArticleTag && longRead)
  );
}

function safeParseUrl(value: string): URL | null {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}
