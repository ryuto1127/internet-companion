export interface AnalyzeRequest {
  url: string;
  title: string;
  text: string;
}

export interface AnalyzeResponse {
  summary: string;
}

const API_BASE_URL =
  process.env.NODE_ENV === "development"
    ? "http://localhost:3000"
    : "https://internet-companion.ryuto-2007-11-27.workers.dev/";

const MAX_TEXT_LENGTH = 5000;

export async function analyzeContent(
  payload: AnalyzeRequest
): Promise<AnalyzeResponse> {

  const safePayload = {
    ...payload,
    text: payload.text.slice(0, MAX_TEXT_LENGTH),
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  const response = await fetch(`${API_BASE_URL}/api/analyze`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(safePayload),
    signal: controller.signal,
  });

  clearTimeout(timeout);

  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }

  let data: AnalyzeResponse;

  try {
    data = await response.json();
  } catch {
    throw new Error("Invalid JSON response from API");
  }

  return data;
}
