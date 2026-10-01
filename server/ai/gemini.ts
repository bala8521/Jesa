// --------------------------------------------------
// JESA GEMINI CLIENT
// VP1 - Interactions API
// --------------------------------------------------

import "dotenv/config";

import {
  GoogleGenAI,
} from "@google/genai";

// --------------------------------------------------
// CONFIGURATION
// --------------------------------------------------

const apiKey =
  process.env.GEMINI_API_KEY;

const model =
  process.env.GEMINI_MODEL ||
  "gemini-3.8-flash";

if (!apiKey) {
  throw new Error(
    "GEMINI_API_KEY is not configured in .env",
  );
}

// --------------------------------------------------
// CLIENT
// --------------------------------------------------

const ai =
  new GoogleGenAI({
    apiKey,
  });

// --------------------------------------------------
// GEMINI INTERACTION
// --------------------------------------------------

export async function askGemini(
  prompt: string,
): Promise<string> {

  const interaction =
    await ai.interactions.create({
      model,
      input: prompt,
      generation_config: {
        thinking_level: "low",
      },
    });

  return (
    interaction.output_text ??
    ""
  );
}