import {
  GoogleGenerativeAI,
  type Content,
  type FunctionDeclaration,
  type Tool,
} from '@google/generative-ai'

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
  const result = await chat.sendMessage(lastMessage.parts)
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

  // Fetch image as base64
  const response = await fetch(imageUrl)
  const blob = await response.blob()
  const base64 = await blobToBase64(blob)
  const mimeType = blob.type || 'image/jpeg'

  const result = await model.generateContent([
    { inlineData: { data: base64.split(',')[1], mimeType } },
    prompt,
  ])

  return result.response.text()
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}
