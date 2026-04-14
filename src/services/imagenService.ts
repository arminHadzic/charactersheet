import { GoogleGenAI, SafetyFilterLevel } from '@google/genai'

export async function generateImage(apiKey: string, prompt: string): Promise<string> {
  const ai = new GoogleGenAI({ apiKey })

  const response = await ai.models.generateImages({
    model: 'imagen-3.0-generate-002',
    prompt,
    config: {
      numberOfImages: 1,
      aspectRatio: '1:1',
      safetyFilterLevel: SafetyFilterLevel.BLOCK_ONLY_HIGH,
    },
  })

  const imageBytes = response.generatedImages?.[0]?.image?.imageBytes
  if (!imageBytes) throw new Error('No image returned from Imagen')

  return `data:image/png;base64,${imageBytes}`
}
