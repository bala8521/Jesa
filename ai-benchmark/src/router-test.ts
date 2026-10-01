import { jesaAI } from "./router";

const prompt =
  "Explain what an API is to a beginner in 4 short sentences.";

console.log("");
console.log("========================================");
console.log("       JESA PROVIDER ROUTER TEST");
console.log("========================================");

console.log("\nPrompt:");
console.log(prompt);

console.log("\nSending request...\n");

const result = await jesaAI(prompt);

console.log("----------------------------------------");
console.log("RESULT");
console.log("----------------------------------------");

console.log(
  `Success: ${result.success ? "YES" : "NO"}`
);

console.log(
  `Provider: ${result.provider ?? "NONE"}`
);

console.log(
  `Model: ${result.model ?? "NONE"}`
);

console.log(
  `Latency: ${Math.round(result.latencyMs)} ms`
);

console.log(
  `Fallback used: ${
    result.fallbackUsed ? "YES" : "NO"
  }`
);

console.log("\nResponse:");

console.log(
  result.response || "(empty)"
);

console.log("\nAttempts:");

for (const attempt of result.attempts) {
  console.log(
    `\n${attempt.provider}`
  );

  console.log(
    `  Success: ${
      attempt.success ? "YES" : "NO"
    }`
  );

  console.log(
    `  Latency: ${
      Math.round(attempt.latencyMs)
    } ms`
  );

  if (attempt.reason) {
    console.log(
      `  Reason: ${attempt.reason}`
    );
  }

  if (attempt.error) {
    console.log(
      `  Error: ${attempt.error}`
    );
  }
}

console.log("");
console.log("========================================");
console.log("Router test completed.");
console.log("========================================");