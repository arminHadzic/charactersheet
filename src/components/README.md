# React Components

This directory contains the encapsulated, reusable presentational and interactive pieces of the application interface.

**What it does:**
It houses all the UI widgets that the user interacts with. For example:
- `ApiKeyGate.tsx`: Protects access to the application by asking for a Gemini API key.
- `CharacterInput.tsx`: The primary text and URL input fields to capture user generation constraints.
- `AgentStatusBar.tsx`: A visual indicator reflecting the current processing steps running on the backend.
- `ModelSheetViewer.tsx`: The display component rendering the fully composed model sheet canvas to the user after generation finishes.

**Dependencies:**
- Connected to `store/sessionStore.ts` to read globally reactive state variables (such as the loading status or the current image payload).
- Connected to standard React hooks (`useState`, `useEffect`).
