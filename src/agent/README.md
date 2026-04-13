# agent

This is the AI orchestration layer. It drives the multi-step, tool-calling conversation with Gemini that turns a character image URL into a completed model sheet.

## What it does

`orchestrator.ts` manages the conversation loop. Each call to `runTurn` appends a new user message to the running chat history, sends the full history to Gemini, and then processes whatever comes back — either a plain text reply (forwarded to the chat panel) or one or more function calls (dispatched to `toolHandlers.ts`). The loop keeps running until Gemini stops issuing tool calls, at which point the turn is complete. The orchestrator also holds the `CharacterProfile` and `SheetPlan` in memory between turns so that refinement requests work correctly.

`tools.ts` defines the five Gemini function declarations (`analyze_character`, `plan_sheet_components`, `generate_component`, `compose_sheet`, `regenerate_component`) in the schema format that the Gemini SDK expects.

`toolHandlers.ts` contains the actual implementation of each tool. When Gemini calls `analyze_character` it passes the image URL to Gemini Vision; when it calls `generate_component` it calls Imagen 3 to produce the image; when it calls `compose_sheet` it signals the app to run the canvas composer.

`systemPrompt.ts` contains the detailed instructions that tell Gemini how to behave: the required tool-call sequence, communication style, quality standards, and how to handle refinement requests after the initial sheet is done.

`types.ts` holds all shared TypeScript interfaces used across the agent and the rest of the app: `SheetComponent`, `SheetPlan`, `CharacterProfile`, `AgentStatus`, and `ChatMessage`.

## Why we have it

The character sheet generation workflow requires several sequential AI calls with shared state between them (the character profile informs the generation prompts, the component list informs composition). A dedicated agent layer keeps this stateful, async orchestration logic completely separate from both the UI and the raw API clients.

## Dependencies

- **`../services`** — calls `callGeminiWithTools` and `analyzeImageWithVision` from `geminiService`, and `generateImage` from `imagenService`
