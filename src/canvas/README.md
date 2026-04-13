# canvas

This is the image composition layer. It assembles the individual component images produced by Imagen 3 into a single, print-ready model sheet.

## What it does

`sheetComposer.ts` exports one function, `composeModelSheet`. It creates an off-screen HTML `<canvas>` at A3 landscape resolution (2480 × 1754 px), draws a background, an outer border, and a header bar with the character name and a generation timestamp, then lays the component images out in a responsive grid that fills the available area. Each image gets a label beneath it. After all images are placed, it adds a thin footer line and returns the finished canvas as a base64 PNG data URL, which the store saves and `ModelSheetViewer` displays.

## Why we have it

The final model sheet needs to be a single, shareable image rather than a grid of separate tiles. Browser Canvas 2D is well-suited for this: it runs entirely client-side with no server round-trip, can produce high-resolution output, and gives precise control over layout and typography. Isolating this logic in its own subdirectory keeps image-manipulation concerns out of both the agent and the UI.

## Dependencies

- **`../agent`** — consumes `SheetComponent` types (specifically the `imageData` base64 strings and `label` fields produced by the agent's tool handlers)
