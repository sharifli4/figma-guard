import { ensureSuccess, type LLMProvider, type LLMTextRequest } from './base'

const DEFAULT_BASE_URL = 'https://generativelanguage.googleapis.com'

export class GeminiProvider implements LLMProvider {
  async send(request: LLMTextRequest) {
    const baseUrl = request.providerConfig.baseUrl.trim() || DEFAULT_BASE_URL
    const model = encodeURIComponent(request.providerConfig.model)
    const apiKey = encodeURIComponent(request.providerConfig.apiKey)

    const response = await fetch(`${baseUrl}/v1beta/models/${model}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: request.systemPrompt }],
        },
        contents: [
          {
            role: 'user',
            parts: [{ text: request.userPrompt }],
          },
        ],
        generationConfig: {
          temperature: request.providerConfig.temperature,
        },
      }),
    }).then(ensureSuccess)

    const data = (await response.json()) as {
      candidates?: Array<{
        content?: {
          parts?: Array<{
            text?: string
          }>
        }
      }>
    }

    return (
      data.candidates?.[0]?.content?.parts
        ?.map((part) => part.text ?? '')
        .join('\n') ?? ''
    )
  }
}
