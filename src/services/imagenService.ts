const GEMINI_IMAGE_API_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image-preview:generateContent'

export async function generateImage(
  apiKey: string,
  prompt: string,
  referenceImageBase64?: string | null,
): Promise<string> {
  const parts: any[] = [{ text: prompt }]

  if (referenceImageBase64) {
    parts.push({
      inlineData: {
        mimeType: 'image/png',
        data: referenceImageBase64,
      },
    })
  }

  const payload = {
    contents: [
      {
        role: 'user',
        parts: parts,
      },
    ],
    generationConfig: {
      responseModalities: ['IMAGE'],
    },
  }

  const response = await fetch(`${GEMINI_IMAGE_API_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(err)
  }

  const data = await response.json()
  let imageBytes = ''
  
  if (data.predictions && data.predictions.length > 0) {
    imageBytes = data.predictions[0].bytesBase64Encoded
  } else if (data.candidates && data.candidates.length > 0) {
    imageBytes = data.candidates[0].content.parts[0].inlineData.data
  }

  if (!imageBytes) throw new Error('No image returned from Gemini')

  return `data:image/png;base64,${imageBytes}`
}

export async function fetchImageAsBase64(url: string): Promise<string | null> {
  try {
    let objectUrl = url
    if (!url.startsWith('data:')) {
      const res = await fetch(url)
      if (!res.ok) return null
      const blob = await res.blob()
      objectUrl = URL.createObjectURL(blob)
    }

    return new Promise((resolve) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = img.width || 512
        canvas.height = img.height || 512
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          resolve(null)
          return
        }
        // Use white background for transparent images/SVGs
        ctx.fillStyle = 'white'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        const dataUrl = canvas.toDataURL('image/png')
        if (objectUrl !== url) URL.revokeObjectURL(objectUrl)
        resolve(dataUrl.split(',')[1] ?? null)
      }
      img.onerror = () => {
        if (objectUrl !== url) URL.revokeObjectURL(objectUrl)
        resolve(null)
      }
      img.src = objectUrl
    })
  } catch {
    return null
  }
}
