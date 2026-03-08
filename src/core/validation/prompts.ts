import type { ChatMessage, NodeSnapshot, RuleDocument, ValidationScope } from '../../shared/types'

function formatRuleSection(index: number, title: string, body: string) {
  return `${index + 1}. ${title}\n${body.trim()}`.trim()
}

function formatNodeSnapshot(snapshot: NodeSnapshot) {
  return JSON.stringify(snapshot, null, 2)
}

function buildRuleSummary(rules: RuleDocument) {
  const formattedSections = rules.sections
    .map((section, index) => formatRuleSection(index, section.title, section.body))
    .join('\n\n')

  return formattedSections.length > 0 ? formattedSections : rules.rawMarkdown.trim()
}

export function buildValidationSystemPrompt(scope: ValidationScope) {
  const subject = scope === 'scan' ? 'a page scan' : 'a changed design node'

  return [
    'You are a design system validator for a Figma plugin.',
    `You are checking ${subject} against uploaded design rules.`,
    'Respond with JSON only.',
    'The JSON shape must be:',
    JSON.stringify(
      {
        summary: 'string',
        issues: [
          {
            nodeId: 'string',
            nodeName: 'string',
            ruleId: 'string',
            ruleTitle: 'string',
            severity: 'error | warning | info',
            message: 'string',
            suggestion: 'string',
          },
        ],
      },
      null,
      2,
    ),
    'If there are no problems, return an empty issues array and a short summary.',
  ].join('\n')
}

export function buildValidationUserPrompt(
  scope: ValidationScope,
  rules: RuleDocument,
  snapshots: NodeSnapshot[],
) {
  const scopeLabel = scope === 'scan' ? 'Current page scan' : 'Changed nodes'

  return [
    `Rules file: ${rules.fileName}`,
    '',
    'Design system rules:',
    buildRuleSummary(rules),
    '',
    `${scopeLabel}:`,
    snapshots.map(formatNodeSnapshot).join('\n\n'),
  ].join('\n')
}

export function buildChatSystemPrompt(rules: RuleDocument) {
  return [
    'You answer questions about uploaded design system rules.',
    'Ground every answer in the provided rules.',
    'If the rules do not answer the question, say that clearly.',
    '',
    'Rules:',
    buildRuleSummary(rules),
  ].join('\n')
}

export function buildChatUserPrompt(question: string, messages: ChatMessage[]) {
  const history = messages
    .slice(-6)
    .map((message) => `${message.role.toUpperCase()}: ${message.content}`)
    .join('\n')

  return history.length > 0 ? `${history}\nUSER: ${question}` : question
}
