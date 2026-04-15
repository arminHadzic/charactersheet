# External System Services

This directory handles cross-boundary API communication and network requests.

**What it does:**
It abstracts away HTTP calls to separated backend architecture and external vendors. 
- `backendService.ts`: Specifically handles the `POST` interface responsible for packaging user inputs (like style preferences and base64 parsed image content) and firing it at our local Python FastAPI server (`http://localhost:8000`), expecting completed component layouts in return.
- `imagenService.ts` / `geminiService.ts`: (Legacy or isolated implementations) that perform raw interactions against Google's Gemini SDKs and Imagen HTTP protocols, primarily focused on Base64 image parsing and extraction.

**Dependencies:**
- Connected inherently to the external FastAPI application backend on port `8000`.
- Used natively by `App.tsx` and the action orchestrators to dispatch workloads out of the browser.
