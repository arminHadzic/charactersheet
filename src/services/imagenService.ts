const IMAGEN_API_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-fast-generate-001:predict'

export async function generateImage(
  apiKey: string,
  prompt: string,
  referenceImageBase64?: string | null,
): Promise<string> {
  // Build instance — include subject reference image when available
  const instance: Record<string, unknown> = { prompt }
  if (referenceImageBase64) {
    instance.referenceImages = [
      {
        referenceType: 'REFERENCE_TYPE_SUBJECT',
        referenceId: 1,
        referenceImage: { bytesBase64Encoded: referenceImageBase64 },
        subjectImageConfig: { subjectType: 'SUBJECT_TYPE_DEFAULT' },
      },
      {
        referenceType: 'REFERENCE_TYPE_STYLE',
        referenceId: 2,
        referenceImage: { bytesBase64Encoded: referenceImageBase64 },
        styleImageConfig: {},
      },
    ]
  }

  const body = JSON.stringify({
    instances: [instance],
    parameters: {
      sampleCount: 1,
      aspectRatio: '1:1',
      personGeneration: 'allow_adult',
    },
  })

  const response = await fetch(`${IMAGEN_API_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  })

  // If the reference-image call fails, retry without it
  if (!response.ok && referenceImageBase64) {
    const fallbackBody = JSON.stringify({
      instances: [{ prompt }],
      parameters: {
        sampleCount: 1,
        aspectRatio: '1:1',
        personGeneration: 'allow_adult',
      },
    })
    const fallback = await fetch(`${IMAGEN_API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: fallbackBody,
    })
    if (!fallback.ok) {
      const err = await fallback.text()
      throw new Error(err)
    }
    const fallbackData = await fallback.json() as { predictions: { bytesBase64Encoded: string }[] }
    const fallbackBytes = fallbackData.predictions?.[0]?.bytesBase64Encoded
    if (!fallbackBytes) throw new Error('No image returned from Imagen')
    return `data:image/png;base64,${fallbackBytes}`
  }

  if (!response.ok) {
    const err = await response.text()
    throw new Error(err)
  }

  const data = await response.json() as { predictions: { bytesBase64Encoded: string }[] }
  const imageBytes = data.predictions?.[0]?.bytesBase64Encoded
  if (!imageBytes) throw new Error('No image returned from Imagen')

  return `data:image/png;base64,${imageBytes}`
}

/**
 * Fetch an image URL and return its raw base64 bytes (no data-URL prefix).
 * Returns null if fetching fails (CORS, network error, etc.).
 */
export async function fetchImageAsBase64(url: string): Promise<string | null> {
  // Data URLs: extract base64 directly
  if (url.startsWith('data:')) {
    const parts = url.split(',')
    return parts[1] ?? null
  }
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const blob = await res.blob()
    return new Promise<string | null>((resolve) => {
      const reader = new FileReader()
      reader.onloadend = () => {
        const result = reader.result as string
        resolve(result.split(',')[1] ?? null)
      }
      reader.onerror = () => resolve(null)
      reader.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}
