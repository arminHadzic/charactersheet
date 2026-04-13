# store

This directory contains the single global Zustand store that holds all runtime application state.

## What it does

`sessionStore.ts` defines and exports `useSessionStore`, a Zustand hook that gives any component or module access to the shared session state. The store tracks:

- **API key** — the Gemini key entered by the user, persisted to `localStorage`.
- **Character URL** — the image URL currently being processed.
- **Chat messages** — the list of user and agent messages shown in the chat panel.
- **Agent status** — the current phase of a generation run (`idle`, `analyzing`, `planning`, `generating`, `composing`, `done`, `error`) plus a human-readable detail string.
- **Sheet plan and components** — the `SheetPlan` returned by the agent's `plan_sheet_components` tool, including the live status and image data of each `SheetComponent` as it is generated.
- **Composed sheet** — the final base64 PNG data URL produced by the canvas composer.
- **Composition trigger** — an incrementing counter that `App.tsx` watches via `useEffect` to know when to call `composeModelSheet`.
- **Reset** — a single action that clears all generation state so a new character can be processed without reloading the page.

## Why we have it

The application has several parts that need to communicate without being directly coupled: the agent callbacks update component status as images arrive, the canvas composer waits for all components to finish, and the UI reflects every intermediate state in real time. A shared store with a reactive subscription model (Zustand) is the simplest way to coordinate these without prop-drilling or complex event buses.

## Dependencies

- **`../agent`** — imports `ChatMessage`, `SheetComponent`, `SheetPlan`, and `AgentStatus` types
- **`zustand`** — external state management library
