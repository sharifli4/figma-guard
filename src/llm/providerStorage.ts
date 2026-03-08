import type { ProviderConfig } from '../shared/types'

const PROVIDER_STORAGE_KEY = 'figma-rules-plugin:provider-config'

export async function loadStoredProviderConfig() {
  const storedConfig = await figma.clientStorage.getAsync(PROVIDER_STORAGE_KEY)
  return (storedConfig as ProviderConfig | null) ?? null
}

export async function saveStoredProviderConfig(config: ProviderConfig) {
  await figma.clientStorage.setAsync(PROVIDER_STORAGE_KEY, config)
}
