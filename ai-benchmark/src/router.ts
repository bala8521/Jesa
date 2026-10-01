import {
  benchmarkGemini,
  benchmarkGroq,
  benchmarkNemotron,
  type BenchmarkPrompt,
} from "./providers";

export type AIProvider =
  | "Groq"
  | "Gemini"
  | "Nemotron";

export type FailureReason =
  | "TIMEOUT"
  | "RATE_LIMIT"
  | "PROVIDER_UNAVAILABLE"
  | "EMPTY_RESPONSE"
  | "AUTH_ERROR"
  | "UNKNOWN";

export interface AIResponse {
  success: boolean;

  provider: AIProvider | null;
  model: string | null;

  response: string;

  latencyMs: number;

  fallbackUsed: boolean;

  attempts: {
    provider: AIProvider;
    success: boolean;
    latencyMs: number;
    error?: string;
    reason?: FailureReason;
  }[];
}

const PROVIDER_ORDER: AIProvider[] = [
  "Groq",
  "Gemini",
  "Nemotron",
];

export async function jesaAI(
  prompt: string
): Promise<AIResponse> {
  const start = performance.now();

  const test: BenchmarkPrompt = {
    name: "JESA Router Request",
    prompt,
  };

  const attempts: AIResponse["attempts"] = [];

  for (let index = 0; index < PROVIDER_ORDER.length; index++) {
    const provider = PROVIDER_ORDER[index];

    const attemptStart = performance.now();

    try {
      const result = await executeProvider(
        provider,
        test
      );

      const latencyMs =
        performance.now() - attemptStart;

      if (result.success) {
        return {
          success: true,

          provider,

          model: result.model,

          response: result.response,

          latencyMs:
            performance.now() - start,

          fallbackUsed: index > 0,

          attempts: [
            ...attempts,
            {
              provider,
              success: true,
              latencyMs,
            },
          ],
        };
      }

      attempts.push({
        provider,
        success: false,
        latencyMs,
        error: result.error,
        reason: classifyFailure(
          result.error
        ),
      });
    } catch (error) {
      const latencyMs =
        performance.now() - attemptStart;

      const message =
        error instanceof Error
          ? error.message
          : String(error);

      attempts.push({
        provider,
        success: false,
        latencyMs,
        error: message,
        reason: classifyFailure(
          message
        ),
      });
    }
  }

  return {
    success: false,

    provider: null,

    model: null,

    response:
      "All configured AI providers are currently unavailable.",

    latencyMs:
      performance.now() - start,

    fallbackUsed: true,

    attempts,
  };
}

/* =========================================================
   PROVIDER EXECUTION
   ========================================================= */

async function executeProvider(
  provider: AIProvider,
  test: BenchmarkPrompt
) {
  switch (provider) {
    case "Groq":
      return benchmarkGroq(test);

    case "Gemini":
      return benchmarkGemini(test);

    case "Nemotron":
      return benchmarkNemotron(test);
  }
}

/* =========================================================
   FAILURE CLASSIFICATION
   ========================================================= */

function classifyFailure(
  error?: string
): FailureReason {
  if (!error) {
    return "UNKNOWN";
  }

  const message =
    error.toLowerCase();

  if (
    message.includes("429") ||
    message.includes("rate limit") ||
    message.includes("too many requests")
  ) {
    return "RATE_LIMIT";
  }

  if (
    message.includes("503") ||
    message.includes("502") ||
    message.includes("unavailable") ||
    message.includes("resourceexhausted") ||
    message.includes("worker local")
  ) {
    return "PROVIDER_UNAVAILABLE";
  }

  if (
    message.includes("empty")
  ) {
    return "EMPTY_RESPONSE";
  }

  if (
    message.includes("401") ||
    message.includes("403") ||
    message.includes("api key") ||
    message.includes("unauthorized")
  ) {
    return "AUTH_ERROR";
  }

  if (
    message.includes("timeout") ||
    message.includes("timed out")
  ) {
    return "TIMEOUT";
  }

  return "UNKNOWN";
}