import type {
  CompanionPagePayload,
  PageAnswer,
  PageDeepDive,
  PageSummary,
} from "./types";

interface CompanionRequest {
  mode: "summary" | "ask" | "deep-dive";
  page: CompanionPagePayload;
  question?: string;
}

interface SummaryApiResponse {
  summary: PageSummary;
}

interface AskApiResponse {
  answer: PageAnswer;
}

interface DeepDiveApiResponse {
  deepDive: PageDeepDive;
}

const API_BASE_URL =
  "https://internet-companion.ryuto-2007-11-27.workers.dev";

const MAX_TEXT_LENGTH = 12000;

export async function analyzePage(
  page: CompanionPagePayload
): Promise<PageSummary> {
  const response = await requestCompanion<SummaryApiResponse>({
    mode: "summary",
    page,
  });

  return response.summary;
}

export async function askPageQuestion(
  page: CompanionPagePayload,
  question: string
): Promise<PageAnswer> {
  const response = await requestCompanion<AskApiResponse>({
    mode: "ask",
    page,
    question,
  });

  return response.answer;
}

export async function deepDivePage(
  page: CompanionPagePayload
): Promise<PageDeepDive> {
  const response = await requestCompanion<DeepDiveApiResponse>({
    mode: "deep-dive",
    page,
  });

  return response.deepDive;
}

async function requestCompanion<TResponse>(
  payload: CompanionRequest
): Promise<TResponse> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  const safePayload: CompanionRequest = {
    ...payload,
    question: payload.question?.trim(),
    page: {
      ...payload.page,
      text: payload.page.text.slice(0, MAX_TEXT_LENGTH),
    },
  };

  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}/api/analyze`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(safePayload),
      signal: controller.signal,
    });
  } catch {
    clearTimeout(timeout);
    throw new Error("Network error while contacting API");
  }

  clearTimeout(timeout);

  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }

  try {
    return (await response.json()) as TResponse;
  } catch {
    throw new Error("Invalid JSON response from API");
  }
}
