import type { ProviderConfig } from '../../shared/types'

export interface LLMTextRequest {
  providerConfig: ProviderConfig
  systemPrompt: string
  userPrompt: string
}

export interface LLMProvider {
  send(request: LLMTextRequest): Promise<string>
}

export function ensureSuccess(response: Response) {
  if (response.ok) {
    return response
  }

  return response.text().then((body) => {
    throw new Error(body || `Request failed with status ${response.status}.`)
  })
}

export function normalizeBaseUrl(baseUrl: string, fallbackUrl: string) {
  const value = baseUrl.trim()
  return value.length > 0 ? value.replace(/\/+$/, '') : fallbackUrl
}
