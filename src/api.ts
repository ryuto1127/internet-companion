export interface AnalyzeRequest {
  url: string;
  title: string;
  text: string;
}

export interface AnalyzeResponse {
  standfirst: string;
  summary: string;
  bullets: string[];
  model: string;
}

const API_BASE_URL =
  "https://internet-companion.ryuto-2007-11-27.workers.dev";

const MAX_TEXT_LENGTH = 12000;

export async function analyzeContent(
  payload: AnalyzeRequest
): Promise<AnalyzeResponse> {

  const safePayload: AnalyzeRequest = {
    ...payload,
    text: payload.text.slice(0, MAX_TEXT_LENGTH),
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25000);

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
  } catch (err) {
    clearTimeout(timeout);
    throw new Error("Network error while contacting API");
  }

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
