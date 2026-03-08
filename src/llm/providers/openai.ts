import { ensureSuccess, normalizeBaseUrl, type LLMProvider, type LLMTextRequest } from './base'

const DEFAULT_BASE_URL = 'https://api.openai.com'

export class OpenAIProvider implements LLMProvider {
  async send(request: LLMTextRequest) {
    const baseUrl = normalizeBaseUrl(request.providerConfig.baseUrl, DEFAULT_BASE_URL)
    const response = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${request.providerConfig.apiKey}`,
      },
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
