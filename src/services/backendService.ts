import { fetchImageAsBase64 } from './imagenService'

interface GeneratePayload {
  apiKey: string
  referenceImageBase64: string
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
  imageUrl: string,
  userPreferences: string
): Promise<GenerateResponse> {
  const base64 = await fetchImageAsBase64(imageUrl)
  if (!base64) {
    throw new Error("Could not fetch the reference image as base64 (CORS or network error).")
  }
  
  const payload: GeneratePayload = {
    apiKey,
    referenceImageBase64: base64,
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
