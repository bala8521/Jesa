// --------------------------------------------------
// JESA INTELLIGENCE ENGINE
// VP1 - v0.3
// --------------------------------------------------

export type Intent =
  | "greeting"
  | "question"
  | "help"
  | "debugging"
  | "search"
  | "emotional_expression"
  | "general";

export type EmotionSignal =
  | "positive"
  | "negative"
  | "frustrated"
  | "excited"
  | "uncertain"
  | "neutral";

export interface EmotionResult {
  signal: EmotionSignal;
  confidence: number;
  evidence: string[];
}

export interface JESAAnalysis {
  intent: Intent;
  emotion: EmotionResult;
  response: string;
  needsAI: boolean;
}

// --------------------------------------------------
// NORMALIZE
// --------------------------------------------------

function normalize(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

// --------------------------------------------------
// WORD / PHRASE MATCHING
// --------------------------------------------------

function containsKeyword(
  text: string,
  keyword: string,
): boolean {
  const escaped = keyword.replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&",
  );

  const pattern = new RegExp(
    `(^|\\s)${escaped}(?=\\s|$|[!?.,])`,
    "i",
  );

  return pattern.test(text);
}

function containsAny(
  text: string,
  keywords: string[],
): boolean {
  return keywords.some((keyword) =>
    containsKeyword(text, keyword),
  );
}

// --------------------------------------------------
// INTENT DETECTION
// --------------------------------------------------

function detectIntent(
  text: string,
): Intent {

  // Debugging has priority over generic questions.
  if (
    containsAny(text, [
      "debug",
      "debugging",
      "bug",
      "error",
      "exception",
      "not working",
      "doesn't work",
      "doesnt work",
      "failed",
      "failure",
      "issue",
      "problem",
      "broken",
      "stuck",
    ])
  ) {
    return "debugging";
  }

  // Search
  if (
    containsAny(text, [
      "search",
      "find",
      "look up",
      "lookup",
      "google",
    ])
  ) {
    return "search";
  }

  // Help
  if (
    containsAny(text, [
      "help",
      "how do i",
      "how can i",
      "can you help",
      "assist",
    ])
  ) {
    return "help";
  }

  // Emotional expression
  if (
    containsAny(text, [
      "sad",
      "angry",
      "frustrated",
      "upset",
      "worried",
      "stressed",
      "tired",
      "annoyed",
    ])
  ) {
    return "emotional_expression";
  }

  // Question
  if (
    text.endsWith("?") ||
    containsAny(text, [
      "what",
      "why",
      "when",
      "where",
      "who",
      "which",
      "how",
    ])
  ) {
    return "question";
  }

  // Greeting
  if (
    containsAny(text, [
      "hello",
      "hi",
      "hey",
      "good morning",
      "good evening",
      "good afternoon",
    ])
  ) {
    return "greeting";
  }

  return "general";
}

// --------------------------------------------------
// EMOTION DETECTION
// --------------------------------------------------

function detectEmotion(
  text: string,
): EmotionResult {

  // ----------------------------------------------
  // FRUSTRATION
  // ----------------------------------------------

  const frustrationWords = [
    "frustrated",
    "annoyed",
    "damn",
    "ugh",
    "failed",
    "not working",
    "doesn't work",
    "doesnt work",
    "broken",
    "stuck",
  ];

  const frustrationEvidence =
    frustrationWords.filter((word) =>
      containsKeyword(text, word),
    );

  if (frustrationEvidence.length > 0) {
    return {
      signal: "frustrated",
      confidence: Math.min(
        0.55 +
          frustrationEvidence.length * 0.08,
        0.95,
      ),
      evidence: frustrationEvidence,
    };
  }

  // ----------------------------------------------
  // EXCITEMENT
  // ----------------------------------------------

  const excitedWords = [
    "wow",
    "amazing",
    "excited",
    "awesome",
    "finally",
  ];

  const excitedEvidence =
    excitedWords.filter((word) =>
      containsKeyword(text, word),
    );

  if (excitedEvidence.length > 0) {
    return {
      signal: "excited",
      confidence: Math.min(
        0.60 +
          excitedEvidence.length * 0.08,
        0.95,
      ),
      evidence: excitedEvidence,
    };
  }

  // ----------------------------------------------
  // POSITIVE
  // ----------------------------------------------

  const positiveWords = [
    "good",
    "great",
    "nice",
    "happy",
    "thanks",
    "thank you",
    "awesome",
    "love",
  ];

  const positiveEvidence =
    positiveWords.filter((word) =>
      containsKeyword(text, word),
    );

  if (positiveEvidence.length > 0) {
    return {
      signal: "positive",
      confidence: Math.min(
        0.55 +
          positiveEvidence.length * 0.08,
        0.90,
      ),
      evidence: positiveEvidence,
    };
  }

  // ----------------------------------------------
  // NEGATIVE
  // ----------------------------------------------

  const negativeWords = [
    "sad",
    "angry",
    "upset",
    "worried",
    "stress",
    "stressed",
    "bad",
    "hate",
    "pain",
  ];

  const negativeEvidence =
    negativeWords.filter((word) =>
      containsKeyword(text, word),
    );

  if (negativeEvidence.length > 0) {
    return {
      signal: "negative",
      confidence: Math.min(
        0.55 +
          negativeEvidence.length * 0.08,
        0.90,
      ),
      evidence: negativeEvidence,
    };
  }

  // ----------------------------------------------
  // UNCERTAINTY
  // ----------------------------------------------

  const uncertainWords = [
    "maybe",
    "perhaps",
    "not sure",
    "i don't know",
    "i dont know",
    "confused",
    "uncertain",
  ];

  const uncertainEvidence =
    uncertainWords.filter((word) =>
      containsKeyword(text, word),
    );

  if (uncertainEvidence.length > 0) {
    return {
      signal: "uncertain",
      confidence: Math.min(
        0.55 +
          uncertainEvidence.length * 0.08,
        0.90,
      ),
      evidence: uncertainEvidence,
    };
  }

  // ----------------------------------------------
  // DEFAULT
  // ----------------------------------------------

  return {
    signal: "neutral",
    confidence: 0.50,
    evidence: [],
  };
}

// --------------------------------------------------
// AI ROUTING
// --------------------------------------------------

function shouldUseAI(
  text: string,
  intent: Intent,
): boolean {

  // Simple greetings stay local.
  if (intent === "greeting") {
    return false;
  }

  // Search requests currently go to Gemini.
  if (intent === "search") {
    return true;
  }

  // Questions require reasoning.
  if (intent === "question") {
    return true;
  }

  // Debugging benefits from AI reasoning.
  if (intent === "debugging") {
    return true;
  }

  // Help requests generally require reasoning.
  if (intent === "help") {
    return true;
  }

  // Emotional statements remain local for now.
  if (intent === "emotional_expression") {
    return false;
  }

  // Very short generic messages stay local.
  if (text.length < 8) {
    return false;
  }

  // General natural-language requests
  // go to Gemini.
  return true;
}

// --------------------------------------------------
// LOCAL RESPONSE
// --------------------------------------------------

function generateLocalResponse(
  intent: Intent,
  emotion: EmotionResult,
): string {

  switch (intent) {

    case "greeting":
      return (
        "Hello. JESA is online. " +
        "How can I help?"
      );

    case "emotional_expression":
      return (
        "I noticed an emotional signal in " +
        "your message. I'll take that context " +
        "into account while responding."
      );

    default:

      if (
        emotion.signal === "frustrated"
      ) {
        return (
          "There may be some frustration in " +
          "the message. Let's focus on the " +
          "specific problem and solve it one " +
          "step at a time."
        );
      }

      return (
        "I understand. JESA is ready " +
        "for the next instruction."
      );
  }
}

// --------------------------------------------------
// MAIN ENGINE
// --------------------------------------------------

export function processMessage(
  input: string,
): JESAAnalysis {

  const text =
    normalize(input);

  const intent =
    detectIntent(text);

  const emotion =
    detectEmotion(text);

  const needsAI =
    shouldUseAI(
      text,
      intent,
    );

  const response =
    generateLocalResponse(
      intent,
      emotion,
    );

  return {
    intent,
    emotion,
    response,
    needsAI,
  };
}