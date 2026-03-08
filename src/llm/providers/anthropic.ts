import { ensureSuccess, normalizeBaseUrl, type LLMProvider, type LLMTextRequest } from './base'

const DEFAULT_BASE_URL = 'https://api.anthropic.com'

export class AnthropicProvider implements LLMProvider {
  async send(request: LLMTextRequest) {
    const baseUrl = normalizeBaseUrl(request.providerConfig.baseUrl, DEFAULT_BASE_URL)
    const response = await fetch(`${baseUrl}/v1/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': request.providerConfig.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: request.providerConfig.model,
        max_tokens: 1200,
        temperature: request.providerConfig.temperature,
        system: request.systemPrompt,
        messages: [
          {
            role: 'user',
            content: request.userPrompt,
          },
        ],
      }),
    }).then(ensureSuccess)

    const data = (await response.json()) as {
      content?: Array<{
        type?: string
        text?: string
      }>
    }

    return (
      data.content
        ?.filter((item) => item.type === 'text' && typeof item.text === 'string')
        .map((item) => item.text)
        .join('\n') ?? ''
    )
  }
}
