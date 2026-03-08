import type { RuleDocument } from '../../shared/types'

const RULE_STORAGE_KEY = 'figma-rules-plugin:rules'

export async function loadStoredRules() {
  const storedRules = await figma.clientStorage.getAsync(RULE_STORAGE_KEY)
  return (storedRules as RuleDocument | null) ?? null
}

export async function saveStoredRules(rules: RuleDocument) {
  await figma.clientStorage.setAsync(RULE_STORAGE_KEY, rules)
}
