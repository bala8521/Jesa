export type ProviderName =
  | "Gemini"
  | "Groq"
  | "Nemotron";

export interface BenchmarkResult {
  provider: ProviderName;
  model: string;
  promptName: string;

  success: boolean;

  ttftMs: number | null;
  totalMs: number;

  outputTokens: number | null;
  tokensPerSecond: number | null;

  response: string;
  error?: string;
}