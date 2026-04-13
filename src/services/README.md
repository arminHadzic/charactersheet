# services

This directory contains the thin client wrappers around the two Google AI APIs the app uses: Gemini (text + vision) and Imagen 3 (image generation).

## What's in here

`geminiService.ts` wraps the `@google/generative-ai` SDK. It exposes three functions:

- `initGemini(apiKey)` — creates and caches a `GoogleGenerativeAI` client instance for the session.
- `callGeminiWithTools(history, systemPrompt, tools)` — sends a full conversation history to the `gemini-2.5-flash` model with a set of function declarations attached, then returns either the text response or the list of function calls the model wants to make.
- `analyzeImageWithVision(apiKey, imageUrl, prompt)` — sends an image URL and a text prompt to Gemini's vision model and returns the text response. It passes the URL as a `fileData` part so Gemini's servers fetch the image directly, avoiding browser CORS restrictions.

`imagenService.ts` wraps the Imagen 3 model. It exposes one function, `generateImage(apiKey, prompt)`, which calls `imagen-3.0-generate-002`, requests a single 1:1 image, and returns the result as a base64 `data:image/png` URL.

## Why we have it

Isolating the API calls here means the agent's tool handlers stay clean and testable — they work with plain data and delegate all network I/O to this layer. It also makes it straightforward to swap models or add caching in one place without touching orchestration logic.

## Dependencies

- **`@google/generative-ai`** — the official Google Generative AI JavaScript SDK (no other internal dependencies)
