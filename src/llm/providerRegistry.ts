import type { ProviderConfig } from '../shared/types'
import { AnthropicProvider } from './providers/anthropic'
import { CustomProvider } from './providers/custom'
import { GeminiProvider } from './providers/gemini'
import { OllamaProvider } from './providers/ollama'
import { OpenAIProvider } from './providers/openai'

const providerRegistry = {
  openai: new OpenAIProvider(),
  anthropic: new AnthropicProvider(),
  gemini: new GeminiProvider(),
  ollama: new OllamaProvider(),
  custom: new CustomProvider(),
}

export function getProvider(config: ProviderConfig) {
  return providerRegistry[config.kind]
}

export function getDefaultBaseUrl(kind: ProviderConfig['kind']) {
  switch (kind) {
    case 'openai':
      return 'https://api.openai.com'
    case 'anthropic':
      return 'https://api.anthropic.com'
    case 'gemini':
      return 'https://generativelanguage.googleapis.com'
    case 'ollama':
      return 'http://localhost:11434'
    case 'custom':
      return 'http://localhost:1234/v1'
  }
}

export function getDefaultModel(kind: ProviderConfig['kind']) {
  switch (kind) {
    case 'openai':
      return 'gpt-4.1-mini'
    case 'anthropic':
      return 'claude-3-5-haiku-latest'
    case 'gemini':
      return 'gemini-2.0-flash'
    case 'ollama':
      return 'llama3.1'
    case 'custom':
      return 'local-model'
  }
}
