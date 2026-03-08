import type {
  ProviderConfig,
  ValidationIssue,
  ValidationResult,
  ValidationScope,
} from '../../shared/types'

function stripCodeFence(rawResponse: string) {
  const trimmed = rawResponse.trim()

  if (!trimmed.startsWith('```')) {
    return trimmed
  }

  return trimmed.replace(/^```[a-zA-Z]*\n?/, '').replace(/\n?```$/, '').trim()
}

function normalizeSeverity(value: string) {
  if (value === 'error' || value === 'warning' || value === 'info') {
    return value
  }

  return 'warning'
}

function normalizeIssues(value: unknown) {
  if (!Array.isArray(value)) {
    return [] as ValidationIssue[]
  }

  return value.flatMap((issue): ValidationIssue[] => {
    if (!issue || typeof issue !== 'object') {
      return []
    }

    const candidate = issue as Record<string, unknown>

    return [
      {
        nodeId: String(candidate.nodeId ?? ''),
        nodeName: String(candidate.nodeName ?? 'Unknown node'),
        ruleId: String(candidate.ruleId ?? 'unspecified-rule'),
        ruleTitle: String(candidate.ruleTitle ?? 'Unspecified rule'),
        severity: normalizeSeverity(String(candidate.severity ?? 'warning')),
        message: String(candidate.message ?? 'Potential design-system conflict detected.'),
        suggestion: String(candidate.suggestion ?? ''),
      },
    ]
  })
}

export function parseValidationResponse(params: {
  rawResponse: string
  requestId: string
  scope: ValidationScope
  pageName: string
  nodeIds: string[]
  providerConfig: ProviderConfig
}) {
  const cleanResponse = stripCodeFence(params.rawResponse)

  try {
    const parsed = JSON.parse(cleanResponse) as Record<string, unknown>

    const result: ValidationResult = {
      requestId: params.requestId,
      scope: params.scope,
      summary: String(parsed.summary ?? 'Validation completed.'),
      issues: normalizeIssues(parsed.issues),
      generatedAt: Date.now(),
      pageName: params.pageName,
      nodeIds: params.nodeIds,
      model: params.providerConfig.model,
      providerKind: params.providerConfig.kind,
      rawResponse: params.rawResponse,
    }

    return result
  } catch {
    return {
      requestId: params.requestId,
      scope: params.scope,
      summary: 'The model returned non-JSON output. Review the raw response.',
      issues: [],
      generatedAt: Date.now(),
      pageName: params.pageName,
      nodeIds: params.nodeIds,
      model: params.providerConfig.model,
      providerKind: params.providerConfig.kind,
      rawResponse: params.rawResponse,
    } satisfies ValidationResult
  }
}
