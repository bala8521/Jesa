import "dotenv/config";

const apiKey = process.env.OPENROUTER_API_KEY;

if (!apiKey) {
  console.error("❌ OPENROUTER_API_KEY is missing.");
  process.exit(1);
}

const MODEL = "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free";

console.log("JESA → OpenRouter verification");
console.log("--------------------------------");
console.log(`Model: ${MODEL}`);
console.log("Sending one free-model request...\n");

const start = performance.now();

try {
  const response = await fetch(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      method: "POST",

      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost:3000",
        "X-Title": "JESA",
      },

      body: JSON.stringify({
        model: MODEL,

        messages: [
          {
            role: "user",
            content:
              "What is Mirai? Explain it to a beginner in 5 short sentences",
          },
        ],

        reasoning: {
          enabled: false,
        },

        max_tokens: 50,
        temperature: 0,
      }),
    }
  );

  const elapsed = performance.now() - start;

  const data = await response.json();

  console.log("\nRaw response:");
  console.log(JSON.stringify(data, null, 2));

  console.log(`HTTP status: ${response.status}`);
  console.log(`Latency: ${Math.round(elapsed)} ms`);

  if (!response.ok) {
    console.error("\n❌ OpenRouter request failed.");
    console.error(JSON.stringify(data, null, 2));
    process.exit(1);
  }

  const answer = data.choices?.[0]?.message?.content;

  console.log("\nResponse:");
  console.log(answer || "(empty response)");

  console.log("\nModel returned:");
  console.log(data.model);

  console.log("\nUsage:");
  console.log(
    JSON.stringify(
      data.usage ?? {},
      null,
      2
    )
  );

  console.log(
    "\n✅ OpenRouter connection successful."
  );
} catch (error) {
  console.error("\n❌ Connection error:");

  console.error(
    error instanceof Error
      ? error.message
      : String(error)
  );

  process.exit(1);
}