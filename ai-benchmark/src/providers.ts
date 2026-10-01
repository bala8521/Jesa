import "dotenv/config";

import OpenAI from "openai";
import { GoogleGenAI } from "@google/genai";

import type {
  BenchmarkResult,
} from "./types";

export interface BenchmarkPrompt {
  name: string;
  prompt: string;
}

/* =========================================================
   GEMINI
   ========================================================= */

const gemini = process.env.GEMINI_API_KEY
  ? new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
    })
  : null;

const GEMINI_MODEL =
  process.env.GEMINI_MODEL || "gemini-3.8-flash";

export async function benchmarkGemini(
  test: BenchmarkPrompt
): Promise<BenchmarkResult> {
  const start = performance.now();
  let ttftMs: number | null = null;
  let fullText = "";

  if (!gemini) {
    return failedResult(
      "Gemini",
      GEMINI_MODEL,
      test,
      0,
      "GEMINI_API_KEY missing"
    );
  }

  try {
    const stream =
      await gemini.models.generateContentStream({
        model: GEMINI_MODEL,
        contents: test.prompt,
      });

    let usage: any = null;

    for await (const chunk of stream) {
      const text = chunk.text ?? "";

      if (text && ttftMs === null) {
        ttftMs = performance.now() - start;
      }

      fullText += text;

      if ((chunk as any).usageMetadata) {
        usage = (chunk as any).usageMetadata;
      }
    }

    const totalMs = performance.now() - start;

    const outputTokens =
      usage?.candidatesTokenCount ?? null;

    const tokensPerSecond =
      outputTokens && totalMs > 0
        ? outputTokens / (totalMs / 1000)
        : null;

    if (!fullText.trim()) {
      return failedResult(
        "Gemini",
        GEMINI_MODEL,
        test,
        totalMs,
        "Empty Gemini response",
        ttftMs
      );
    }

    return {
      provider: "Gemini",
      model: GEMINI_MODEL,
      promptName: test.name,
      success: true,
      ttftMs,
      totalMs,
      outputTokens,
      tokensPerSecond,
      response: fullText,
    };
  } catch (error) {
    return failedResult(
      "Gemini",
      GEMINI_MODEL,
      test,
      performance.now() - start,
      error instanceof Error
        ? error.message
        : String(error),
      ttftMs
    );
  }
}

/* =========================================================
   OPENAI-COMPATIBLE CLIENTS
   ========================================================= */

function createClient(
  apiKey: string | undefined,
  baseURL: string
) {
  if (!apiKey) {
    return null;
  }

  return new OpenAI({
    apiKey,
    baseURL,
  });
}

const groq = createClient(
  process.env.GROQ_API_KEY,
  "https://api.groq.com/openai/v1"
);

const openrouter = createClient(
  process.env.OPENROUTER_API_KEY,
  "https://openrouter.ai/api/v1"
);

const GROQ_MODEL =
  process.env.GROQ_MODEL || "openai/gpt-oss-20b";

const NEMOTRON_MODEL =
  "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free";

/* =========================================================
   GROQ
   ========================================================= */

export async function benchmarkGroq(
  test: BenchmarkPrompt
): Promise<BenchmarkResult> {
  return benchmarkOpenAICompatible(
    "Groq",
    GROQ_MODEL,
    groq,
    test
  );
}

/* =========================================================
   NEMOTRON
   ========================================================= */

export async function benchmarkNemotron(
  test: BenchmarkPrompt
): Promise<BenchmarkResult> {
  return benchmarkOpenAICompatible(
    "Nemotron",
    NEMOTRON_MODEL,
    openrouter,
    test,
    true
  );
}

/* =========================================================
   OPENAI-COMPATIBLE STREAMING
   ========================================================= */

async function benchmarkOpenAICompatible(
  provider: "Groq" | "Nemotron",
  model: string,
  client: OpenAI | null,
  test: BenchmarkPrompt,
  disableReasoning = false
): Promise<BenchmarkResult> {
  const start = performance.now();

  if (!client) {
    return failedResult(
      provider,
      model,
      test,
      0,
      `${provider} API key missing`
    );
  }

  try {
    const stream = await client.chat.completions.create({
      model,

      messages: [
        {
          role: "user",
          content: test.prompt,
        },
      ],

      temperature: 0,
      max_tokens: 300,

      ...(disableReasoning
        ? {
            reasoning: {
              enabled: false,
            },
          }
        : {}),

      stream: true,
      stream_options: {
        include_usage: true,
      },
    });

    let ttftMs: number | null = null;
    let fullText = "";
    let outputTokens: number | null = null;

    for await (const chunk of stream) {
      const text =
        chunk.choices?.[0]?.delta?.content ?? "";

      if (text && ttftMs === null) {
        ttftMs = performance.now() - start;
      }

      fullText += text;

      if (chunk.usage?.completion_tokens != null) {
        outputTokens =
          chunk.usage.completion_tokens;
      }
    }

    const totalMs = performance.now() - start;

    const tokensPerSecond =
      outputTokens && totalMs > 0
        ? outputTokens / (totalMs / 1000)
        : null;

    if (!fullText.trim()) {
      return failedResult(
        provider,
        model,
        test,
        totalMs,
        "Empty model response",
        ttftMs
      );
    }

    return {
      provider,
      model,
      promptName: test.name,
      success: true,
      ttftMs,
      totalMs,
      outputTokens,
      tokensPerSecond,
      response: fullText,
    };
  } catch (error) {
    return failedResult(
      provider,
      model,
      test,
      performance.now() - start,
      error instanceof Error
        ? error.message
        : String(error)
    );
  }
}

/* =========================================================
   FAILURE HELPER
   ========================================================= */

function failedResult(
  provider: "Gemini" | "Groq" | "Nemotron",
  model: string,
  test: BenchmarkPrompt,
  totalMs: number,
  error: string,
  ttftMs: number | null = null
): BenchmarkResult {
  return {
    provider,
    model,
    promptName: test.name,
    success: false,
    ttftMs,
    totalMs,
    outputTokens: null,
    tokensPerSecond: null,
    response: "",
    error,
  };
}