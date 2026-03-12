import { Readability } from "@mozilla/readability";

export interface ExtractedContent {
  title: string;
  text: string;
}

export function extractContent(): ExtractedContent | null {
  try {
    // Clone the document to avoid mutating the live DOM
    const documentClone = document.cloneNode(true) as Document;
    const reader = new Readability(documentClone);
    const article = reader.parse();

    if (!article) {
      return null;
    }

    const text = extractReadableText(article.content, article.textContent || "");

    if (!text) {
      return null;
    }

    return {
      title: article.title || document.title || "",
      text,
    };
  } catch (err) {
    console.error("[Internet Companion] Extraction failed:", err);
    return null;
  }
}

function extractReadableText(contentHtml: string, fallbackText: string): string {
  const parsedText = extractBlockText(contentHtml);

  if (parsedText) {
    return parsedText;
  }

  return normalizeWhitespace(fallbackText);
}

function extractBlockText(contentHtml: string): string {
  if (!contentHtml.trim()) {
    return "";
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(contentHtml, "text/html");
  const blocks = Array.from(
    doc.body.querySelectorAll(
      "h1, h2, h3, h4, p, li, blockquote, pre, figcaption"
    )
  );

  const lines = blocks
    .map((node) => normalizeWhitespace(node.textContent || ""))
    .filter((line) => line.length > 0)
    .filter((line, index, items) => line.length > 25 || items.length <= 3)
    .filter((line, index, items) => items.indexOf(line) === index);

  return lines.join("\n\n");
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}
