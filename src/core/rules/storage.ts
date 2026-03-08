import type { RuleDocument } from '../../shared/types'

const RULE_STORAGE_KEY = 'figma-rules-plugin:rules'
let fallbackRules: RuleDocument | null = null

export async function loadStoredRules() {
  try {
    const storedRules = await figma.clientStorage.getAsync(RULE_STORAGE_KEY)
    return (storedRules as RuleDocument | null) ?? fallbackRules
  } catch {
    return fallbackRules
  }
}

export async function saveStoredRules(rules: RuleDocument) {
  fallbackRules = rules

  try {
    await figma.clientStorage.setAsync(RULE_STORAGE_KEY, rules)
  } catch {
    return
  }
}
