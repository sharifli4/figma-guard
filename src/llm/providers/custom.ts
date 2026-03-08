import { ensureSuccess, type LLMProvider, type LLMTextRequest } from './base'

function resolveEndpoint(baseUrl: string) {
  const normalized = baseUrl.trim().replace(/\/+$/, '')

  if (normalized.endsWith('/chat/completions')) {
    return normalized
  }

  if (normalized.endsWith('/v1')) {
    return `${normalized}/chat/completions`
  }

  return `${normalized}/v1/chat/completions`
}

export class CustomProvider implements LLMProvider {
  async send(request: LLMTextRequest) {
    const endpoint = resolveEndpoint(request.providerConfig.baseUrl)
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    if (request.providerConfig.apiKey.trim().length > 0) {
      headers.Authorization = `Bearer ${request.providerConfig.apiKey}`
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: request.providerConfig.model,
        temperature: request.providerConfig.temperature,
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
      choices?: Array<{
        message?: {
          content?: string
        }
      }>
    }

    return data.choices?.[0]?.message?.content ?? ''
  }
}
