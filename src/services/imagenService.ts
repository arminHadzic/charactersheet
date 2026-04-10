import { GoogleGenerativeAI } from '@google/generative-ai'

export async function generateImage(apiKey: string, prompt: string): Promise<string> {
  const genAI = new GoogleGenerativeAI(apiKey)

  const model = genAI.getGenerativeModel({ model: 'imagen-3.0-generate-002' })

  // @ts-expect-error - generateImages is on the Imagen model
  const result = await model.generateImages({
    prompt,
    number_of_images: 1,
    aspect_ratio: '1:1',
    safety_filter_level: 'block_some',
  })

  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  const imageBytes = result.images[0].imageBytes as string
  return `data:image/png;base64,${imageBytes}`
}
