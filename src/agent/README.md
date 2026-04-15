# Agent Types

This directory previously contained the client-side Gemini agent orchestration loop, which managed multi-step tool calling. 

As part of the LangGraph migration, the heavy orchestration logic was moved to a Python FastAPI backend to better handle API rate-limits and style locking. 

**What it does now:**
Currently, this directory primarily exports the core TypeScript type definitions (`types.ts`) like `SheetComponent`, `SheetPlan`, and `CharacterProfile` which define the data structures used uniformly across the frontend and backend.

**Dependencies:**
- None for the type definitions.
