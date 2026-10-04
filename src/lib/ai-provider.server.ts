// Direct AI provider client. No proxy / middleware service sits between this
// app and the model provider — this calls Google's Gemini API directly
// using GEMINI_API_KEY (a free Google AI Studio key: https://aistudio.google.com/apikey).
//
// .server.ts suffix keeps this out of the client bundle (TanStack Start
// convention) — the API key never reaches the browser.
import { createGoogleGenerativeAI } from "@ai-sdk/google";

function getGoogleClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Missing GEMINI_API_KEY. Get a free key at https://aistudio.google.com/apikey and set it in your .env file or your Vercel project's Environment Variables.",
    );
  }
  return createGoogleGenerativeAI({ apiKey });
}

// Centralized model choice so every AI feature (coach, insights, story,
// dna, reports, activities) upgrades together by changing this one line
// (or the GEMINI_MODEL env var, if set). Defaults to Gemini 2.5 Flash —
// fast, multimodal, and available on Google AI Studio's free tier.
export function getAiModel() {
  const google = getGoogleClient();
  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  return google(model);
}

// Shared timeout for all AI calls (coach, insights, story, dna, reports,
// activities). Prevents a hung/slow Gemini request from tying up a server
// function indefinitely — pass the returned AbortSignal as `abortSignal`
// to generateText/generateObject. Default 25s comfortably fits inside
// typical serverless function time limits while still giving the model
// room to finish a normal response.
export function aiTimeoutSignal(ms = 25_000): AbortSignal {
  return AbortSignal.timeout(ms);
}
