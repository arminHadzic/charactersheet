import {
  GoogleGenerativeAI,
  type Content,
  type FunctionDeclaration,
  type Tool,
} from '@google/generative-ai'

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
  characterDescription: string
  colorPalette: ColorSwatchData[]
  components: ComponentPlan[]
}

// One-shot template: single Gemini call returns a detailed character description
// (used as consistent context in every Imagen prompt) + per-component prompts.
// Color palette is excluded — generated from canvas using extracted hex colors.
const SHEET_TEMPLATE_PROMPT = `You are an animation character artist. Analyze the reference image carefully and return ONLY valid JSON — no markdown, no explanation, no code fences.

{
  "characterName": "character name if recognizable, otherwise 'Character'",
  "summary": "one enthusiastic sentence describing the character for the user",
  "artStyle": "precise style descriptor, e.g. 'western cartoon with bold black outlines, flat cel-shaded colors, exaggerated proportions'",
  "characterDescription": "Dense single-paragraph visual description for image consistency. Include every detail: exact body proportions and build, skin/fur/scale color with descriptors, hair or head features, eye shape and color, nose/mouth, all clothing items with exact colors, footwear, accessories, any distinctive markings or unique features. This will be copied verbatim into every image generation prompt.",
  "colorPalette": [
    {"hex": "#RRGGBB", "label": "Short name", "area": "where this color appears"}
  ],
  "components": [
    {"id":"front_view",         "type":"front_view",         "label":"Front View",     "prompt":""},
    {"id":"three_quarter_view", "type":"three_quarter_view", "label":"3/4 View",       "prompt":""},
    {"id":"expression_sheet",   "type":"expression_sheet",   "label":"Expressions",    "prompt":""},
    {"id":"action_pose",        "type":"action_pose",        "label":"Signature Pose", "prompt":""},
    {"id":"back_view",          "type":"back_view",          "label":"Back View",      "prompt":""}
  ]
}

Build each component prompt using this exact template:
"[artStyle] illustration. [characterDescription]. [VIEW INSTRUCTION]. White background. No scenery."

VIEW INSTRUCTIONS — use these exactly:
- front_view: "Full body, facing directly toward viewer, neutral standing pose, arms relaxed at sides, character fills ~85% of image height. Single character, single pose only."
- three_quarter_view: "Full body, body angled 45 degrees right, face turned toward viewer, neutral standing pose, character fills ~85% of image height. Single character, single pose only."
- expression_sheet: "Six facial close-up portraits in a 2x3 grid, labeled: Happy, Sad, Angry, Surprised, Scared, Determined. Head and bust only, no full body, no repeated full-body poses."
- action_pose: "Full body, one single dynamic pose expressing this character's personality, character fills ~85% of image height. One character, one pose only. No duplicate figures."
- back_view: "Full body, character facing directly away from viewer — back of head and back of body only, face is NOT visible, no face shown at all, neutral standing pose, arms relaxed, character fills ~85% of image height. Single character, single pose only."

Rules:
- characterDescription must be IDENTICAL text in all 5 prompts
- Keep each total prompt under 480 characters
- Extract 5–8 key colors for colorPalette`

export async function analyzeAndPlanSheet(apiKey: string, imageUrl: string): Promise<SheetAnalysis> {
  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })
  const mimeType = guessMimeType(imageUrl)

  const result = await withRetry(() =>
    model.generateContent([{ fileData: { fileUri: imageUrl, mimeType } }, SHEET_TEMPLATE_PROMPT]),
  )

  const raw = result.response.text()
  const fenceStripped = raw.replace(/```(?:json)?\n?/g, '').trim()
  const jsonMatch = fenceStripped.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error(`Could not parse sheet analysis. Response: ${raw.slice(0, 300)}`)

  return JSON.parse(jsonMatch[0]) as SheetAnalysis
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
