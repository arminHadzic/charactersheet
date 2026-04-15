# Canvas Composition

This directory contains the HTML5 Canvas logic required to stitch the individual generated components into a single, cohesive image file (the final model sheet).

**What it does:**
After the Python backend finishes generating the various individual poses and expressions for a character, it returns a list of Base64 images. The `sheetComposer.ts` utility programmatically creates a 2D canvas, draws a structured background layout (headers, footers, pure white component slots), scales the incoming images appropriately, and paints them into a unified "Model Sheet". `colorPaletteCanvas.ts` may also be used to draw color swatch metadata directly onto an image.

**Dependencies:**
- Connected to `App.tsx` which triggers it when all component payloads arrive.
- It is purely functional and has no external library dependencies besides native browser `Canvas API`.
