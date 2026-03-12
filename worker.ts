interface Env {
  OPENAI_API_KEY?: string;
  OPENAI_MODEL?: string;
}

interface AnalyzeRequest {
  url: string;
  title: string;
  text: string;
}

interface AnalyzeResponse {
  standfirst: string;
  summary: string;
  bullets: string[];
  model: string;
}

interface OpenAIResponse {
  model?: string;
  output?: Array<{
    content?: Array<{
      text?: string;
    }>;
  }>;
  output_text?: string;
}

const DEFAULT_MODEL = "gpt-5-mini";
const MAX_TEXT_LENGTH = 12000;
const BULLET_COUNT = 3;
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json",
};

const STOP_WORDS = new Set([
  "a",
  "about",
  "after",
  "all",
  "also",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "been",
  "being",
  "but",
  "by",
  "for",
  "from",
  "had",
  "has",
  "have",
  "he",
  "her",
  "hers",
  "him",
  "his",
  "in",
  "into",
  "is",
  "it",
  "its",
  "more",
  "most",
  "new",
  "not",
  "of",
  "on",
  "or",
  "our",
  "she",
  "than",
  "that",
  "the",
  "their",
  "them",
  "there",
  "they",
  "this",
  "to",
  "was",
  "were",
  "what",
  "when",
  "which",
  "who",
  "will",
  "with",
  "would",
  "you",
]);

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: CORS_HEADERS });
    }

    if (url.pathname !== "/api/analyze") {
      return jsonResponse({ error: "Not Found" }, 404);
    }

    if (request.method !== "POST") {
      return jsonResponse({ error: "Method Not Allowed" }, 405);
    }

    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return jsonResponse({ error: "Invalid JSON" }, 400);
    }

    const payload = parseAnalyzeRequest(body);

    if (!payload) {
      return jsonResponse({ error: "Invalid request body" }, 400);
    }

    try {
      const brief = env.OPENAI_API_KEY
        ? await summarizeWithOpenAI(payload, env)
        : summarizeExtractively(payload);

      return jsonResponse(brief);
    } catch (error) {
      console.error("[internet-companion] analysis failed", error);
      return jsonResponse(summarizeExtractively(payload));
    }
  },
};

function parseAnalyzeRequest(body: unknown): AnalyzeRequest | null {
  if (!body || typeof body !== "object") {
    return null;
  }

  const record = body as Record<string, unknown>;

  if (
    typeof record.url !== "string" ||
    typeof record.title !== "string" ||
    typeof record.text !== "string"
  ) {
    return null;
  }

  const text = normalizeWhitespace(record.text);

  if (!text) {
    return null;
  }

  return {
    url: record.url.trim(),
    title: normalizeWhitespace(record.title) || "Untitled article",
    text,
  };
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: CORS_HEADERS,
  });
}

async function summarizeWithOpenAI(
  payload: AnalyzeRequest,
  env: Env
): Promise<AnalyzeResponse> {
  const model = (env.OPENAI_MODEL || DEFAULT_MODEL).trim() || DEFAULT_MODEL;
  const articleText = prepareArticleText(payload.text);
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      reasoning: { effort: "low" },
      instructions:
        "You write elegant, factual article briefs for a browser companion. " +
        "Stick to the supplied article, avoid hype, avoid repetition, and do not invent details. " +
        "Write in clear modern English. Keep the standfirst to one sentence, the summary to two or three sentences, " +
        "and produce exactly three bullets with concrete details.",
      input:
        `Title: ${payload.title}\n` +
        `URL: ${payload.url}\n\n` +
        `Article text:\n${articleText}`,
      text: {
        format: {
          type: "json_schema",
          name: "article_brief",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              standfirst: { type: "string" },
              summary: { type: "string" },
              bullets: {
                type: "array",
                items: { type: "string" },
                minItems: BULLET_COUNT,
                maxItems: BULLET_COUNT,
              },
            },
            required: ["standfirst", "summary", "bullets"],
          },
        },
      },
    }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`OpenAI request failed: ${response.status} ${message}`);
  }

  const data = (await response.json()) as OpenAIResponse;
  const rawText = extractOutputText(data);
  const parsed = JSON.parse(rawText) as Partial<AnalyzeResponse>;

  return normalizeBrief(parsed, data.model || model, payload.title);
}

function summarizeExtractively(payload: AnalyzeRequest): AnalyzeResponse {
  const sentences = splitIntoSentences(prepareArticleText(payload.text)).filter(
    (sentence) => sentence.length >= 40
  );

  if (sentences.length === 0) {
    return {
      standfirst: payload.title,
      summary: payload.title,
      bullets: [payload.title, "No readable details were available.", payload.url],
      model: "extractive-fallback",
    };
  }

  const frequencies = buildWordFrequencies(sentences);
  const ranked = sentences
    .map((sentence, index) => ({
      sentence,
      index,
      score: scoreSentence(sentence, frequencies),
    }))
    .sort((left, right) => right.score - left.score || left.index - right.index);

  const selected = ranked
    .slice(0, Math.min(4, ranked.length))
    .sort((left, right) => left.index - right.index)
    .map((item) => item.sentence);

  const bullets = uniqueStrings(
    selected.slice(0, BULLET_COUNT).map((sentence) => trimSentence(sentence, 120))
  );

  while (bullets.length < BULLET_COUNT) {
    bullets.push(trimSentence(sentences[bullets.length] || payload.title, 120));
  }

  const summarySentences = uniqueStrings(selected.slice(0, 2));
  const standfirst = trimSentence(summarySentences[0] || payload.title, 160);
  const summary = trimSentence(summarySentences.join(" "), 320);

  return {
    standfirst,
    summary,
    bullets,
    model: "extractive-fallback",
  };
}

function normalizeBrief(
  brief: Partial<AnalyzeResponse>,
  model: string,
  fallbackTitle: string
): AnalyzeResponse {
  const standfirst = trimSentence(
    normalizeWhitespace(brief.standfirst || brief.summary || fallbackTitle),
    160
  );
  const summary = trimSentence(
    normalizeWhitespace(brief.summary || brief.standfirst || fallbackTitle),
    320
  );
  const bullets = uniqueStrings(
    Array.isArray(brief.bullets)
      ? brief.bullets
          .map((bullet) => trimSentence(normalizeWhitespace(bullet), 120))
          .filter(Boolean)
      : []
  ).slice(0, BULLET_COUNT);

  while (bullets.length < BULLET_COUNT) {
    bullets.push(standfirst);
  }

  return {
    standfirst,
    summary,
    bullets,
    model,
  };
}

function extractOutputText(data: OpenAIResponse): string {
  if (typeof data.output_text === "string" && data.output_text.trim()) {
    return data.output_text.trim();
  }

  if (!Array.isArray(data.output)) {
    throw new Error("OpenAI response did not include output text");
  }

  const combined = data.output
    .flatMap((item) =>
      Array.isArray(item.content)
        ? item.content.map((contentItem) => contentItem.text || "")
        : []
    )
    .join("")
    .trim();

  if (!combined) {
    throw new Error("OpenAI response content was empty");
  }

  return combined;
}

function prepareArticleText(text: string): string {
  const normalized = normalizeWhitespace(text);

  if (normalized.length <= MAX_TEXT_LENGTH) {
    return normalized;
  }

  const headLength = Math.floor(MAX_TEXT_LENGTH * 0.72);
  const tailLength = MAX_TEXT_LENGTH - headLength - 16;

  return (
    normalized.slice(0, headLength).trim() +
    " [ ... ] " +
    normalized.slice(-tailLength).trim()
  );
}

function splitIntoSentences(text: string): string[] {
  const matches = text.match(/[^.!?]+(?:[.!?]+|$)/g);
  return matches ? matches.map((sentence) => normalizeWhitespace(sentence)) : [];
}

function buildWordFrequencies(sentences: string[]): Map<string, number> {
  const frequencies = new Map<string, number>();

  for (const sentence of sentences) {
    const words = sentence.toLowerCase().match(/[a-z0-9']+/g) || [];

    for (const word of words) {
      if (word.length < 4 || STOP_WORDS.has(word)) {
        continue;
      }

      frequencies.set(word, (frequencies.get(word) || 0) + 1);
    }
  }

  return frequencies;
}

function scoreSentence(
  sentence: string,
  frequencies: Map<string, number>
): number {
  const words = sentence.toLowerCase().match(/[a-z0-9']+/g) || [];

  if (words.length === 0) {
    return 0;
  }

  let score = 0;

  for (const word of words) {
    score += frequencies.get(word) || 0;
  }

  return score / words.length;
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function trimSentence(value: string, maxLength: number): string {
  const text = normalizeWhitespace(value);

  if (text.length <= maxLength) {
    return text;
  }

  const trimmed = text.slice(0, maxLength - 1);
  const lastSpace = trimmed.lastIndexOf(" ");

  return `${(lastSpace > 40 ? trimmed.slice(0, lastSpace) : trimmed).trim()}...`;
}

function uniqueStrings(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    if (!value || seen.has(value)) {
      continue;
    }

    seen.add(value);
    result.push(value);
  }

  return result;
}
