const IMAGEN_API_URL =
  'https://generativelanguage.googleapis.com/v1/models/imagen-3.0-generate-002:predict'

export async function generateImage(apiKey: string, prompt: string): Promise<string> {
  const response = await fetch(`${IMAGEN_API_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      instances: [{ prompt }],
      parameters: {
        sampleCount: 1,
        aspectRatio: '1:1',
        safetyFilterLevel: 'block_some',
      },
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(err)
  }

  const data = await response.json() as { predictions: { bytesBase64Encoded: string }[] }
  const imageBytes = data.predictions?.[0]?.bytesBase64Encoded
  if (!imageBytes) throw new Error('No image returned from Imagen')

  return `data:image/png;base64,${imageBytes}`
}
