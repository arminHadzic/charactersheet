import {
  GoogleGenerativeAI,
  type Content,
  type FunctionDeclaration,
  type Tool,
} from '@google/generative-ai'

export interface ComponentPlan {
  id: string
  type: string
  label: string
  prompt: string
}

export interface SheetAnalysis {
  characterName: string
  summary: string
  components: ComponentPlan[]
}

// One-shot template prompt: single Gemini call returns everything needed
// to generate the full sheet without any follow-up calls.
const SHEET_TEMPLATE_PROMPT = `You are an animation director. Analyze the character image and return ONLY a JSON object — no markdown, no explanation, no code fences.

{
  "characterName": "name or 'Character'",
  "summary": "one friendly sentence describing what you see",
  "components": [
    {"id":"front_view",         "type":"front_view",         "label":"Front View",      "prompt":""},
    {"id":"three_quarter_view", "type":"three_quarter_view", "label":"3/4 View",        "prompt":""},
    {"id":"expression_sheet",   "type":"expression_sheet",   "label":"Expressions",     "prompt":""},
    {"id":"action_pose",        "type":"action_pose",        "label":"Signature Pose",  "prompt":""},
    {"id":"color_palette",      "type":"color_palette",      "label":"Color Reference", "prompt":""},
    {"id":"back_view",          "type":"back_view",          "label":"Back View",       "prompt":""}
  ]
}

For each prompt field: start with the prefix below, then append the character's specific visual details (colors, clothing, face, distinctive features). Keep each prompt under 400 characters.

front_view: "Animation model sheet — full body front view, neutral pose, white background, clean line art."
three_quarter_view: "Animation model sheet — full body 3/4 angle view, slight right turn, white background, clean line art."
expression_sheet: "Animation model sheet — 6 facial expressions in 2x3 grid (happy/sad/angry/surprised/scared/determined), white background."
action_pose: "Animation model sheet — full body dynamic action pose revealing character personality, white background, clean line art."
color_palette: "Animation model sheet — character in flat color with annotated color swatches pointing to each area, white background."
back_view: "Animation model sheet — full body back view, neutral pose, white background, clean line art."`

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
