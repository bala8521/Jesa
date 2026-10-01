import {
  benchmarkGemini,
  benchmarkGroq,
  benchmarkNemotron,
  type BenchmarkPrompt,
} from "./providers";

const tests: BenchmarkPrompt[] = [
  {
    name: "General Explanation",
    prompt:
      "What is Mirai? Explain it to a beginner in 5 short sentences.",
  },

  {
    name: "Calculation",
    prompt:
      "A vehicle travels 150 km in 3 hours. What is its average speed? Explain briefly.",
  },

  {
    name: "Instruction Following",
    prompt:
      "Explain cloud computing using exactly 3 bullet points. No introduction.",
  },

  {
    name: "Coding",
    prompt:
      "Write a JavaScript function that checks whether a number is prime. Return only the function.",
  },

  {
    name: "Structured Output",
    prompt:
      'Return exactly this JSON structure with realistic values: {"name":"JESA","type":"AI assistant","status":"prototype"}',
  },
];

async function run() {
  console.log("");
  console.log("========================================");
  console.log("     JESA STREAMING AI BENCHMARK");
  console.log("========================================");
  console.log("");

  const allResults: any[] = [];

  for (const test of tests) {
    console.log("----------------------------------------");
    console.log(`TEST: ${test.name}`);
    console.log("----------------------------------------");

    console.log("\nPrompt:");
    console.log(test.prompt);

    console.log("\n[Gemini]");

    const gemini = await benchmarkGemini(test);
    printResult(gemini);
    allResults.push(gemini);

    console.log("\n[Groq]");

    const groq = await benchmarkGroq(test);
    printResult(groq);
    allResults.push(groq);

    console.log("\n[Nemotron]");

    const nemotron = await benchmarkNemotron(test);
    printResult(nemotron);
    allResults.push(nemotron);

    console.log("");
  }

  printSummary(allResults);

  console.log("");
  console.log("========================================");
  console.log("Streaming benchmark completed.");
  console.log("========================================");
}

function printResult(result: any) {
  if (!result.success) {
    console.log("Status: ❌ FAILED");

    console.log(
      `TTFT: ${
        result.ttftMs !== null
          ? Math.round(result.ttftMs) + " ms"
          : "N/A"
      }`
    );

    console.log(
      `Total: ${Math.round(result.totalMs)} ms`
    );

    console.log(
      `Error: ${result.error ?? "Unknown error"}`
    );

    return;
  }

  console.log("Status: ✅ SUCCESS");

  console.log(
    `TTFT: ${
      result.ttftMs !== null
        ? Math.round(result.ttftMs) + " ms"
        : "N/A"
    }`
  );

  console.log(
    `Total: ${Math.round(result.totalMs)} ms`
  );

  console.log(
    `Output tokens: ${
      result.outputTokens ?? "unknown"
    }`
  );

  console.log(
    `Tokens/sec: ${
      result.tokensPerSecond
        ? result.tokensPerSecond.toFixed(2)
        : "unknown"
    }`
  );

  console.log("\nResponse:");
  console.log(result.response);
}

function printSummary(results: any[]) {
  console.log("\n\n========================================");
  console.log("             SUMMARY");
  console.log("========================================");

  console.log(
    "\nProvider       Success   TTFT       Total"
  );

  console.log(
    "----------------------------------------"
  );

  for (const provider of [
    "Gemini",
    "Groq",
    "Nemotron",
  ]) {
    const providerResults =
      results.filter(
        (r) => r.provider === provider
      );

    const successful =
      providerResults.filter(
        (r) => r.success
      );

    const avgTTFT =
      successful.length > 0
        ? successful.reduce(
            (sum, r) =>
              sum + (r.ttftMs ?? 0),
            0
          ) / successful.length
        : null;

    const avgTotal =
      successful.length > 0
        ? successful.reduce(
            (sum, r) =>
              sum + r.totalMs,
            0
          ) / successful.length
        : null;

    console.log(
      `${provider.padEnd(14)} ` +
      `${successful.length}/${providerResults.length}`.padEnd(9) +
      `${avgTTFT !== null ? Math.round(avgTTFT) + " ms" : "N/A"}`.padEnd(11) +
      `${avgTotal !== null ? Math.round(avgTotal) + " ms" : "N/A"}`
    );
  }

  console.log(
    "\nTTFT = Time To First Token"
  );

  console.log(
    "Total = Complete streamed response time"
  );
}

run().catch((error) => {
  console.error("\n❌ Benchmark crashed:");

  console.error(
    error instanceof Error
      ? error.message
      : String(error)
  );

  process.exit(1);
});