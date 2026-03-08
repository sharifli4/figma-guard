import type { ProviderConfig } from '../shared/types'

const PROVIDER_STORAGE_KEY = 'figma-rules-plugin:provider-config'
let fallbackProviderConfig: ProviderConfig | null = null

export async function loadStoredProviderConfig() {
  try {
    const storedConfig = await figma.clientStorage.getAsync(PROVIDER_STORAGE_KEY)
    return (storedConfig as ProviderConfig | null) ?? fallbackProviderConfig
  } catch {
    return fallbackProviderConfig
  }
}

export async function saveStoredProviderConfig(config: ProviderConfig) {
  fallbackProviderConfig = config

  try {
    await figma.clientStorage.setAsync(PROVIDER_STORAGE_KEY, config)
  } catch {
    return
  }
}
