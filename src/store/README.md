# Global State Management

This directory contains the central data repository for the application frontend, using `Zustand`.

**What it does:**
The `sessionStore.ts` acts as the single source of truth for the entire application interface. Instead of passing properties sequentially down the React component tree (prop drilling), components interact with this global memory structure to dispatch updates and read values concurrently.

It stores information such as:
- The persistent `Gemini API key`.
- The current textual or URL references input by the user.
- The `agentStatus` (analyzing, gathering, composing, done) determining what loading UI is shown.
- The compiled `SheetPlan` and final constructed `data:image/...` encoded Model Sheet.

**Dependencies:**
- Relies exclusively on `zustand`, a lightweight context library for React.
- Used pervasively across `src/components/` and `src/app/`.
