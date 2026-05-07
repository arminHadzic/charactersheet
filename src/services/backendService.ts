import { generateImage } from './imagenService'

interface GeneratePayload {
  apiKey: string
  referenceImagesBase64: string[]
  userPreferences: string
}

export interface GeneratedComponent {
  id: string
  type: string
  imageData: string
}

interface GenerateResponse {
  components: GeneratedComponent[]
}

export async function submitToLangGraph(
  apiKey: string,
  imagesBase64: string[],
  userPreferences: string
): Promise<GenerateResponse> {
  const payload: GeneratePayload = {
    apiKey,
    referenceImagesBase64: imagesBase64,
    userPreferences
  }

  const res = await fetch("http://127.0.0.1:8000/generate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  })

  if (!res.ok) {
    const txt = await res.text()
    throw new Error("Backend error: " + txt)
  }

  return await res.json() as GenerateResponse
}

export async function submitServerless(
  apiKey: string,
  imagesBase64: string[],
  userPreferences: string
): Promise<GenerateResponse> {
  const prompt = `A professional animation model sheet of the character. ${userPreferences || ''} The sheet includes a front view, side view, and action poses. The style is clean, vector-like, colorful, and suitable for animation.`
  const refImage = imagesBase64[0] || null
  
  // Directly call Gemini API
  const generatedBase64 = await generateImage(apiKey, prompt, refImage)

  return {
    components: [
      {
        id: "serverless-sheet",
        type: "composite",
        imageData: generatedBase64
      }
    ]
  }
}
