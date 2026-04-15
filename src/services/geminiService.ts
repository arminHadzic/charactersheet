import {
  GoogleGenerativeAI,
  type Content,
  type FunctionDeclaration,
  type Tool,
} from '@google/generative-ai'

import type { CharacterSchema } from '../agent/characterSchema'
import { buildComponentPromptsFromSchema } from '../agent/promptBuilder'

export interface ColorSwatchData {
  hex: string
  label: string
  area?: string
}

export interface ComponentPlan {
  id: string
  type: string
  label: string
  prompt: string
}

export interface SheetAnalysis {
  characterName: string
  summary: string
  artStyle: string
  colorPalette: ColorSwatchData[]
  components: ComponentPlan[]
}

// ---------------------------------------------------------------------------
// Vision extraction prompt — focused purely on filling the CharacterSchema.
// No prompt-building happens here; that is done deterministically in TypeScript
// by promptBuilder.ts once we have the structured data.
// ---------------------------------------------------------------------------
const SCHEMA_EXTRACTION_PROMPT = `You are a professional animation character analyst. Study the reference image with extreme care and extract a precise, structured description. Return ONLY valid JSON matching the schema below — no markdown, no explanation, no code fences.

{
  "character_name": "character name if recognizable, otherwise 'Character'",
  "summary": "one warm, enthusiastic sentence for the user describing what you see",

  "art_style": {
    "overall_style_name": "studio/artist name or descriptive style label, e.g. 'Jhonen Vasquez Nickelodeon cartoon'",
    "outline_style": "outline weight, uniformity, and corner treatment — be precise, e.g. 'very thick uniform black outlines (~4px equivalent), hard square corners, zero line-weight variation, no tapering'",
    "shading_style": "exactly how shading is applied — e.g. 'flat 2D cel-shading, zero gradients anywhere, pure solid flat colour fills, pure black used for shadow areas only'",
    "color_rendering": "how colours are applied — e.g. 'fully saturated pure flat colours, hard colour boundaries, zero blending or anti-aliasing between colour areas, high contrast'",
    "shape_vocabulary": "dominant shape language — e.g. 'angular boxy geometry, rectangular and trapezoidal forms throughout, sharp right-angle corners, minimal organic curves'"
  },

  "face": {
    "head_shape": "exact skull/head geometry in precise terms — e.g. 'large rectangular boxy skull, noticeably wider at the top, flat crown, very angular jaw, no rounded organic curves'",
    "eye_description": "eye shape, relative size, iris colour, pupil detail, sclera — e.g. 'very large circular magenta-pink irises that fill the eye socket, small solid black circular pupils centred in them, no white sclera visible at all, thick black outlines around entire eye'",
    "nose_description": "nose shape and placement — e.g. 'tiny rounded pink bump protruding slightly from the centre of the face, almost vestigial, very small relative to head'",
    "mouth_description": "mouth typical shape and details — e.g. 'small rectangular angular mouth, commonly showing small blocky white teeth, thin black outline, corners are sharp not curved'",
    "head_top_features": "hair, horns, antennae, ears, hat, or anything above the face — e.g. 'two thin black antennae rising from the crown of the head, one slightly taller, tips curved slightly outward'"
  },

  "body": {
    "proportions": "ALL proportion exaggerations relative to head size — e.g. 'head is approximately 40% of total standing height, torso is very small and compact (~20% of height), limbs are extremely thin stick-like, hands are small'",
    "torso_description": "torso shape and exact surface pattern — e.g. 'small compact rectangular torso, covered in alternating hot-pink and slightly darker pink/black thin horizontal equal-width stripes'",
    "arm_description": "arm shape and hand details — e.g. 'extremely thin cylindrical stick-like arms, very small hands with exactly 3 pointed claw-like fingers, wearing form-fitting black gloves'",
    "leg_description": "leg shape and footwear — e.g. 'very short thin cylindrical legs, wearing large chunky black platform boots with very thick flat rectangular soles'"
  },

  "colors": {
    "skin_color": "exact skin/fur colour with approximate hex — e.g. 'bright lime green, approximately #6DBB4A'",
    "dominant_colors": ["each entry as 'hex description of usage', e.g. '#6DBB4A bright lime green — skin', '#E84BA0 hot pink — costume and accessories'"]
  },

  "accessories": [
    "each accessory as a precise description with shape, colour, and placement — e.g. 'smooth rounded grey backpack worn on back, has two flat hot-pink circular polka-dot spots on it'",
    "e.g. 'large chunky black platform boots, very thick flat rectangular soles, worn on feet'"
  ],

  "must_preserve": [
    "list exactly 5 features that are the most critical non-negotiable identity anchors — if any of these are wrong the character is instantly unrecognisable. Be maximally specific about shape, colour, and placement.",
    "example entry: 'very large circular magenta-pink irises with no visible white sclera — the single most important facial feature'",
    "example entry: 'large rectangular boxy skull shape — must not be rounded or organic'"
  ],

  "color_palette": [
    {"hex": "#RRGGBB", "label": "Short name", "area": "exactly where this colour appears"}
  ]
}

Critical instructions:
- Replace every example value with what you actually observe in the image
- Be maximally specific — 'green skin' is useless, 'bright lime green ~#6DBB4A skin covering the entire head, neck, and hands' is useful
- The output will be used to generate new drawings; vague descriptions produce off-model results`

export async function analyzeAndPlanSheet(apiKey: string, imageUrl: string): Promise<SheetAnalysis> {
  // --- Phase 1: vision extraction node — fills the rigid CharacterSchema ---
  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })
  const mimeType = guessMimeType(imageUrl)

  const result = await withRetry(() =>
    model.generateContent([{ fileData: { fileUri: imageUrl, mimeType } }, SCHEMA_EXTRACTION_PROMPT]),
  )

  const raw = result.response.text()
  const fenceStripped = raw.replace(/```(?:json)?\n?/g, '').trim()
  const jsonMatch = fenceStripped.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error(`Could not parse character schema. Response: ${raw.slice(0, 300)}`)

  const schema = JSON.parse(jsonMatch[0]) as CharacterSchema

  // --- Phase 2: deterministic prompt builder — no AI involved ---
  const builtComponents = buildComponentPromptsFromSchema(schema)

  return {
    characterName: schema.character_name,
    summary: schema.summary,
    artStyle: schema.art_style.overall_style_name,
    colorPalette: schema.color_palette,
    components: builtComponents,
  }
}

const RETRYABLE_STATUS_CODES = [429, 503]
const MAX_RETRIES = 4

async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  let lastError: unknown
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fn()
    } catch (err) {
      lastError = err
      const msg = err instanceof Error ? err.message : String(err)
      const isRetryable = RETRYABLE_STATUS_CODES.some((code) => msg.includes(`[${code}`))
      if (!isRetryable || attempt === MAX_RETRIES) throw err
      const delay = Math.min(1000 * 2 ** attempt + Math.random() * 500, 30000)
      await new Promise((resolve) => setTimeout(resolve, delay))
    }
  }
  throw lastError
}

let client: GoogleGenerativeAI | null = null

export function initGemini(apiKey: string) {
  client = new GoogleGenerativeAI(apiKey)
}

export function getClient(): GoogleGenerativeAI {
  if (!client) throw new Error('Gemini client not initialized. Call initGemini() first.')
  return client
}

export async function callGeminiWithTools(
  history: Content[],
  systemPrompt: string,
  tools: FunctionDeclaration[],
): Promise<{
  text: string | null
  functionCalls: Array<{ name: string; args: Record<string, unknown> }>
}> {
  const model = getClient().getGenerativeModel({
    model: 'gemini-2.5-flash',
    systemInstruction: systemPrompt,
    tools: [{ functionDeclarations: tools } as Tool],
  })

  const chat = model.startChat({ history: history.slice(0, -1) })
  const lastMessage = history[history.length - 1]
  const result = await withRetry(() => chat.sendMessage(lastMessage.parts))
  const response = result.response

  const functionCalls =
    response.functionCalls()?.map((fc) => ({
      name: fc.name,
      args: fc.args as Record<string, unknown>,
    })) ?? []

  const text = functionCalls.length === 0 ? response.text() : null

  return { text, functionCalls }
}

export async function analyzeImageWithVision(
  apiKey: string,
  imageUrl: string,
  prompt: string,
): Promise<string> {
  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

  // Pass the URL directly via fileData — Gemini's servers fetch the image,
  // avoiding browser CORS restrictions entirely.
  const mimeType = guessMimeType(imageUrl)
  const result = await withRetry(() =>
    model.generateContent([{ fileData: { fileUri: imageUrl, mimeType } }, prompt]),
  )

  return result.response.text()
}

function guessMimeType(url: string): string {
  const lower = url.toLowerCase().split('?')[0]
  if (lower.endsWith('.png')) return 'image/png'
  if (lower.endsWith('.gif')) return 'image/gif'
  if (lower.endsWith('.webp')) return 'image/webp'
  return 'image/jpeg'
}
