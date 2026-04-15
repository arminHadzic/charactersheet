# App

This directory contains the core application entry points and layout frames.

**What it does:**
`App.tsx` serves as the primary compositional root for the entire frontend application. It handles mounting the authentication gates, rendering the main layout, and orchestrating state handoffs. Specifically, it wires the submission of the user's reference image in the input bar to the backend LangGraph API and delegates the subsequent components matrix to the canvas composer.

**Dependencies:**
- Connected to the `store` to read session memory and API keys.
- Connected to `components` (e.g., `CharacterInput`, `ApiKeyGate`, `ModelSheetViewer`) to build the DOM tree.
- Uses `services/backendService.ts` to dispatch generation commands.
