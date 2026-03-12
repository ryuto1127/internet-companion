import type { CredibilitySignal, PageContext } from "./types";

const HIGH_CREDIBILITY_HOSTS = new Set([
  "apnews.com",
  "bbc.com",
  "bloomberg.com",
  "economist.com",
  "ft.com",
  "nature.com",
  "npr.org",
  "nytimes.com",
  "reuters.com",
  "science.org",
  "theguardian.com",
  "washingtonpost.com",
  "wsj.com",
]);

const MEDIUM_CREDIBILITY_HOSTS = new Set([
  "blogspot.com",
  "github.io",
  "medium.com",
  "quora.com",
  "reddit.com",
  "stackexchange.com",
  "substack.com",
  "wikipedia.org",
  "wordpress.com",
]);

export function evaluateCredibility(
  pageUrl: string,
  context: PageContext
): CredibilitySignal {
  const url = safeParseUrl(pageUrl);
  const host = url?.hostname.replace(/^www\./, "") || "unknown";

  if (
    host.endsWith(".edu") ||
    host.endsWith(".gov") ||
    host.endsWith(".ac.uk") ||
    host === "nih.gov" ||
    host === "who.int" ||
    host === "un.org" ||
    HIGH_CREDIBILITY_HOSTS.has(host) ||
    context.sourceType === "major-news"
  ) {
    return {
      level: "high",
      label: "High credibility",
      rationale:
        "This looks like an established newsroom, academic institution, or public-interest source.",
      sourceType: context.sourceType,
      host,
    };
  }

  if (
    host.endsWith("wikipedia.org") ||
    MEDIUM_CREDIBILITY_HOSTS.has(host) ||
    host.includes("substack") ||
    host.includes("medium.com")
  ) {
    return {
      level: "medium",
      label: "Medium credibility",
      rationale:
        "This source is useful, but it is more community-driven or individually published, so cross-checking helps.",
      sourceType: context.sourceType,
      host,
    };
  }

  return {
    level: "unknown",
    label: "Unknown credibility",
    rationale:
      "The domain alone does not give a strong reliability signal, so treat it as informational rather than authoritative.",
    sourceType: context.sourceType,
    host,
  };
}

function safeParseUrl(value: string): URL | null {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}
