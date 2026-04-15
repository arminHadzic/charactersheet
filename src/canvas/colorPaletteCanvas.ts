import type { ColorSwatchData } from '../services/geminiService'

const SWATCH_W = 140
const SWATCH_H = 100
const LABEL_H = 48
const GAP = 16
const PAD = 28

export function generateColorPaletteImage(swatches: ColorSwatchData[], characterName: string): string {
  void characterName // retained for API compatibility
  const cols = Math.min(swatches.length, 4)
  const rows = Math.ceil(swatches.length / cols)
  const canvasW = PAD * 2 + cols * SWATCH_W + (cols - 1) * GAP
  const canvasH = PAD + rows * (SWATCH_H + LABEL_H + GAP)

  const canvas = document.createElement('canvas')
  canvas.width = canvasW
  canvas.height = canvasH
  const ctx = canvas.getContext('2d')!

  // Background — white to match the sheet
  ctx.fillStyle = '#FFFFFF'
  ctx.fillRect(0, 0, canvasW, canvasH)

  swatches.forEach(({ hex, label, area }, i) => {
    const col = i % cols
    const row = Math.floor(i / cols)
    const x = PAD + col * (SWATCH_W + GAP)
    const y = PAD + row * (SWATCH_H + LABEL_H + GAP)

    // Swatch
    ctx.fillStyle = hex
    ctx.fillRect(x, y, SWATCH_W, SWATCH_H)
    ctx.strokeStyle = 'rgba(0,0,0,0.10)'
    ctx.lineWidth = 1
    ctx.strokeRect(x, y, SWATCH_W, SWATCH_H)

    // Label area background
    ctx.fillStyle = '#F3F4F6'
    ctx.fillRect(x, y + SWATCH_H, SWATCH_W, LABEL_H)

    // Label text
    ctx.textBaseline = 'top'
    ctx.fillStyle = '#111827'
    ctx.font = 'bold 11px Inter, sans-serif'
    ctx.fillText(label, x + 8, y + SWATCH_H + 6, SWATCH_W - 16)

    ctx.fillStyle = '#6B7280'
    ctx.font = '10px "Courier New", monospace'
    ctx.fillText(hex.toUpperCase(), x + 8, y + SWATCH_H + 22, SWATCH_W - 16)

    if (area) {
      ctx.fillStyle = '#9CA3AF'
      ctx.font = '9px Inter, sans-serif'
      ctx.fillText(area, x + 8, y + SWATCH_H + 35, SWATCH_W - 16)
    }
  })

  return canvas.toDataURL('image/png')
}
