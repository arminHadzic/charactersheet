const IMAGEN_API_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:generateImages'

export async function generateImage(apiKey: string, prompt: string): Promise<string> {
  const response = await fetch(`${IMAGEN_API_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt,
      number_of_images: 1,
      aspect_ratio: '1:1',
      safety_filter_level: 'block_some',
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(err)
  }

  const data = await response.json() as { images: { imageBytes: string }[] }
  const imageBytes = data.images?.[0]?.imageBytes
  if (!imageBytes) throw new Error('No image returned from Imagen')

  return `data:image/png;base64,${imageBytes}`
}
