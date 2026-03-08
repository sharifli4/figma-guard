import { buildChatSystemPrompt, buildChatUserPrompt, buildValidationSystemPrompt, buildValidationUserPrompt } from '../core/validation/prompts'
import { parseValidationResponse } from '../core/validation/parseValidationResponse'
import { getProvider } from '../llm/providerRegistry'
import type { ChatMessage, ProviderConfig, RuleDocument, ValidationTask } from '../shared/types'

export async function runValidationTask(task: ValidationTask) {
  const provider = getProvider(task.providerConfig)
  const rawResponse = await provider.send({
    providerConfig: task.providerConfig,
    systemPrompt: buildValidationSystemPrompt(task.scope),
    userPrompt: buildValidationUserPrompt(task.scope, task.rules, task.snapshots),
  })

  return parseValidationResponse({
    rawResponse,
    requestId: task.requestId,
    scope: task.scope,
    pageName: task.pageName,
    nodeIds: task.snapshots.map((snapshot) => snapshot.id),
    providerConfig: task.providerConfig,
  })
}

export async function runRulesChat(params: {
  providerConfig: ProviderConfig
  rules: RuleDocument
  question: string
  messages: ChatMessage[]
}) {
  const provider = getProvider(params.providerConfig)

  return provider.send({
    providerConfig: params.providerConfig,
    systemPrompt: buildChatSystemPrompt(params.rules),
    userPrompt: buildChatUserPrompt(params.question, params.messages),
  })
}
