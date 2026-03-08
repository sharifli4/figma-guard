import { ensureSuccess, normalizeBaseUrl, type LLMProvider, type LLMTextRequest } from './base'

const DEFAULT_BASE_URL = 'http://localhost:11434'

export class OllamaProvider implements LLMProvider {
  async send(request: LLMTextRequest) {
    const baseUrl = normalizeBaseUrl(request.providerConfig.baseUrl, DEFAULT_BASE_URL)
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    if (request.providerConfig.apiKey.trim().length > 0) {
      headers.Authorization = `Bearer ${request.providerConfig.apiKey}`
    }

    const response = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: request.providerConfig.model,
        stream: false,
        options: {
          temperature: request.providerConfig.temperature,
        },
        messages: [
          {
            role: 'system',
            content: request.systemPrompt,
          },
          {
            role: 'user',
            content: request.userPrompt,
          },
        ],
      }),
    }).then(ensureSuccess)

    const data = (await response.json()) as {
      message?: {
        content?: string
      }
    }

    return data.message?.content ?? ''
  }
}
