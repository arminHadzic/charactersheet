# Character Model Sheet Generator

An AI-powered application that seamlessly transforms a single character reference image into a complete, professional 6-component character model sheet using **LangGraph**, **FastAPI**, and **Google Gemini 3.1 Flash Image**.

## Architecture & Design

This application uses a split frontend/backend architecture designed around agentic vision extraction and concurrent generative AI pipelines:

1. **Frontend (React/Vite)**
   - Provides a clean, modern user interface.
   - Collects the reference image URL, user preferences, and a Gemini API Key.
   - Displays the generation pipeline status.
   - Invokes a single-click assembly using HTML Canvas to stitch the generated images into a professional Model Sheet layout.

2. **Backend Engine (FastAPI + LangGraph + Gemini API)**
   - Parses the request and runs a parallel pipeline based on an autonomous sequence.
   - **Vision Node:** Uses Gemini 2.5 Flash Multimodal vision to study the reference image and explicitly extract structural attributes, colors, anatomy rules (like "exactly 2 antennae"), and geometric styling.
   - **Generation Node:** Connects to the **Gemini 3.1 Flash Image Preview** `generateContent` API. It dynamically locks the extracted attributes into high-constraint multimodal prompts. It asynchronously fires 6 concurrent generation requests (`front_view`, `three_quarter_view`, `back_view`, `expression_sheet`, `action_pose`, and `color_palette`).
   - Uses `tenacity` retry loops mapping across all ungraceful HTTP drops/timeouts efficiently to ensure stable concurrent image delivery.

## Local Setup & Run Instructions

### 1. Backend Server Requirements

You need a Python environment manager like `conda` or `mamba`.

1. Create and activate the conda environment:
   ```bash
   mamba env create -f environment.yml
   mamba activate charactersheet
   ```
2. Start the local FastAPI backend server:
   ```bash
   ./run.sh
   # Specifically this runs: uvicorn server.main:app --port 41232 --reload
   ```

### 2. Frontend Development

To run the local development frontend:

1. Install Node.js dependencies:
   ```bash
   npm install
   ```
2. Run the Vite development server:
   ```bash
   npm run dev
   ```

3. Open the provided localhost link in your browser. 
   - Paste an image URL into the input. 
   - Provide your Google AI Studio Gemini API Key. 
   - Click "Generate" and wait for the pipeline to extract vision rules and render the complete model sheet!
