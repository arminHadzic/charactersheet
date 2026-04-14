import {
  GoogleGenerativeAI,
  type Content,
  type FunctionDeclaration,
  type Tool,
} from '@google/generative-ai'

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
