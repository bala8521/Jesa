import { askGemini } from "./gemini.js";

async function main() {
  console.log("Testing Gemini...");

  const response = await askGemini(
    "Reply with exactly: JESA Gemini connection successful."
  );

  console.log("Gemini response:");
  console.log(response);
}

main().catch((error) => {
  console.error("Gemini test failed:");
  console.error(error);
  process.exit(1);
});