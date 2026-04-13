# components

This directory contains all React UI components. Each file is a self-contained widget that reads from the session store and/or receives props from `App.tsx`.

## What's in here

`ApiKeyGate.tsx` — renders a full-screen prompt asking for a Google AI Studio API key the first time the app loads. Once a key is entered it is persisted to `localStorage` and this gate renders its children instead.

`CharacterInput.tsx` — the URL input bar at the top of the screen. Accepts a character image URL and calls the `onGenerate` callback when the user submits.

`AgentStatusBar.tsx` — a thin bar that shows the current agent status (analyzing / planning / generating / composing / done / error) and a human-readable detail string. Visible only while a generation run is in progress.

`ChatPanel.tsx` — the scrolling conversation log on the left sidebar. Displays alternating user and agent messages and includes a text input for sending follow-up requests to the agent after the initial sheet is generated.

`ComponentGrid.tsx` — a compact grid below the chat panel showing the status of each sheet component (pending, generating, done, error) as small thumbnail tiles with labels.

`ModelSheetViewer.tsx` — the large central panel. Displays the composed model sheet image once it is ready, with a download button. Shows an empty state prompt before generation starts.

## Why we have it

Separating UI components from business logic (the agent, store, and services) keeps each component focused on presentation. Components only know how to display data and fire callbacks — they do not call AI APIs or manage state directly.

## Dependencies

- **`../store`** — most components read agent status, messages, sheet plan, and composed sheet URL via `useSessionStore`
- **`../agent`** — `AgentStatusBar` and `ComponentGrid` consume `AgentStatus` and `SheetComponent` types
