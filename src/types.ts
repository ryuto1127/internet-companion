export type PageContextKind = "news" | "wikipedia" | "general";
export type CredibilityLevel = "high" | "medium" | "unknown";

export interface PageContext {
  kind: PageContextKind;
  label: string;
  sourceType: string;
  promptHint: string;
}

export interface CredibilitySignal {
  level: CredibilityLevel;
  label: string;
  rationale: string;
  sourceType: string;
  host: string;
}

export interface CompanionPagePayload {
  url: string;
  title: string;
  text: string;
  context: PageContext;
  credibility: CredibilitySignal;
}

export interface PageSummary {
  standfirst: string;
  summary: string;
  bullets: string[];
  background: string;
  model: string;
}

export interface PageAnswer {
  answer: string;
  followUps: string[];
  model: string;
}

export interface PageDeepDive {
  insights: string[];
  relatedTopics: string[];
  opposingViewpoints: string[];
  background: string[];
  model: string;
}
