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

    if (!article || !article.textContent?.trim()) {
      return null;
    }

    return {
      title: article.title || document.title || "",
      text: article.textContent.trim(),
    };
  } catch (err) {
    console.error("[Internet Companion] Extraction failed:", err);
    return null;
  }
}
