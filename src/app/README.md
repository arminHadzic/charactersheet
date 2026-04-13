# app

This is the application entry point. It contains the root React component, the global stylesheet, and the module bootstrap that mounts the app into the browser.

## What it does

`main.tsx` is the first JavaScript file the browser loads. It calls React's `createRoot` to attach the component tree to the `#root` div in `index.html` and applies the global CSS reset and Tailwind base styles from `index.css`.

`App.tsx` is the top-level React component. It wraps the whole UI in `ApiKeyGate` (which blocks rendering until the user provides a Gemini API key) and then renders the four visible regions of the screen: the header bar, the URL input strip, the left sidebar (chat + component grid), and the main model sheet panel. It also owns the orchestrator lifecycle — creating and re-creating the `AgentOrchestrator` instance whenever the API key changes or a new generation run starts, and wiring its callbacks directly into the session store.

## Why we have it

Every React app needs exactly one place where the component tree is bootstrapped and where top-level concerns (routing, global state wiring, authentication gates) live. Keeping this in `src/app/` separates the "startup plumbing" from the domain logic in the other subdirectories.

## Dependencies

- **`../agent`** — instantiates `AgentOrchestrator` and calls `runTurn` in response to user actions
- **`../canvas`** — calls `composeModelSheet` when the agent signals that all component images are ready
- **`../components`** — renders every visible UI widget
- **`../store`** — reads and writes all shared application state via `useSessionStore`
