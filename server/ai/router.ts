// --------------------------------------------------
// JESA AI ROUTER
// VP1
// --------------------------------------------------

import OpenAI from "openai";
import { GoogleGenAI } from "@google/genai";

// --------------------------------------------------
// CONFIGURATION
// --------------------------------------------------

const groqApiKey =
  process.env.GROQ_API_KEY;

const openRouterApiKey =
  process.env.OPENROUTER_API_KEY;

const geminiApiKey =
  process.env.GEMINI_API_KEY;

const groqModel =
  process.env.GROQ_MODEL ||
  "openai/gpt-oss-20b";

const geminiModel =
  process.env.GEMINI_MODEL ||
  "gemini-3.8-flash";

const nemotronModel =
  "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free";

// --------------------------------------------------
// CLIENTS
// --------------------------------------------------

const groq = groqApiKey
  ? new OpenAI({
      apiKey: groqApiKey,
      baseURL:
        "https://api.groq.com/openai/v1",
    })
  : null;

const openrouter = openRouterApiKey
  ? new OpenAI({
      apiKey: openRouterApiKey,
      baseURL:
        "https://openrouter.ai/api/v1",
    })
  : null;

const gemini = geminiApiKey
  ? new GoogleGenAI({
      apiKey: geminiApiKey,
    })
  : null;

// --------------------------------------------------
// PUBLIC JESA AI FUNCTION
// --------------------------------------------------

export async function askJesaAI(
  prompt: string,
): Promise<string> {

  // ----------------------------------------------
  // 1. GROQ
  // ----------------------------------------------

  try {
    if (groq) {
      console.log(
        "[JESA AI] Trying Groq...",
      );

      const response =
        await groq.chat.completions.create({
          model: groqModel,

          messages: [
            {
              role: "user",
              content: prompt,
            },
          ],

          temperature: 0,
          max_tokens: 500,
        });

      const text =
        response.choices?.[0]?.message?.content ??
        "";

      if (text.trim()) {
        console.log(
          "[JESA AI] Groq succeeded.",
        );

        return text;
      }

      console.warn(
        "[JESA AI] Groq returned empty response.",
      );
    }
  } catch (error) {
    console.error(
      "[JESA AI] Groq failed:",
      error,
    );
  }

  // ----------------------------------------------
  // 2. GEMINI
  // ----------------------------------------------

  try {
    if (gemini) {
      console.log(
        "[JESA AI] Trying Gemini...",
      );

      const interaction =
        await gemini.interactions.create({
          model: geminiModel,
          input: prompt,
          generation_config: {
            thinking_level: "low",
          },
        });

      const text =
        interaction.output_text ??
        "";

      if (text.trim()) {
        console.log(
          "[JESA AI] Gemini succeeded.",
        );

        return text;
      }

      console.warn(
        "[JESA AI] Gemini returned empty response.",
      );
    }
  } catch (error) {
    console.error(
      "[JESA AI] Gemini failed:",
      error,
    );
  }

  // ----------------------------------------------
  // 3. NEMOTRON
  // ----------------------------------------------

  try {
    if (openrouter) {
      console.log(
        "[JESA AI] Trying Nemotron...",
      );

      const response =
        await openrouter.chat.completions.create({
          model: nemotronModel,

          messages: [
            {
              role: "user",
              content: prompt,
            },
          ],

          temperature: 0,
          max_tokens: 500,

          reasoning: {
            enabled: false,
          },
        } as any);

      const text =
        response.choices?.[0]?.message?.content ??
        "";

      if (text.trim()) {
        console.log(
          "[JESA AI] Nemotron succeeded.",
        );

        return text;
      }

      console.warn(
        "[JESA AI] Nemotron returned empty response.",
      );
    }
  } catch (error) {
    console.error(
      "[JESA AI] Nemotron failed:",
      error,
    );
  }

  // ----------------------------------------------
  // ALL PROVIDERS FAILED
  // ----------------------------------------------

  throw new Error(
    "All JESA AI providers are currently unavailable.",
  );
}