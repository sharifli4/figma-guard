export type ProviderKind =
  | 'openai'
  | 'anthropic'
  | 'gemini'
  | 'ollama'
  | 'custom'

export type ValidationSeverity = 'error' | 'warning' | 'info'
export type ValidationScope = 'change' | 'scan'
export type ChatRole = 'user' | 'assistant'

export interface RuleSection {
  id: string
  title: string
  level: number
  body: string
  bullets: string[]
}

export interface RuleDocument {
  fileName: string
  rawMarkdown: string
  uploadedAt: number
  sections: RuleSection[]
}

export interface ProviderConfig {
  kind: ProviderKind
  model: string
  apiKey: string
  baseUrl: string
  temperature: number
}

export interface NodeSnapshot {
  id: string
  name: string
  type: string
  pageName: string
  parentName: string | null
  visible: boolean
  width: number | null
  height: number | null
  x: number | null
  y: number | null
  opacity: number | null
  fills: string[]
  strokes: string[]
  effects: string[]
  layoutMode: string | null
  itemSpacing: number | null
  padding: {
    top: number | null
    right: number | null
    bottom: number | null
    left: number | null
  }
  textContent: string | null
  fontSize: number | null
  fontName: string | null
  charactersLength: number | null
  childCount: number
  componentPropertyKeys: string[]
  variantProperties: Record<string, string>
}

export interface ValidationIssue {
  nodeId: string
  nodeName: string
  ruleId: string
  ruleTitle: string
  severity: ValidationSeverity
  message: string
  suggestion: string
}

export interface ValidationResult {
  requestId: string
  scope: ValidationScope
  summary: string
  issues: ValidationIssue[]
  generatedAt: number
  pageName: string
  nodeIds: string[]
  model: string
  providerKind: ProviderKind
  rawResponse: string
}

export interface ChatMessage {
  id: string
  role: ChatRole
  content: string
  createdAt: number
}

export interface ValidationTask {
  requestId: string
  scope: ValidationScope
  pageName: string
  snapshots: NodeSnapshot[]
  rules: RuleDocument
  providerConfig: ProviderConfig
}

export interface PluginStateSnapshot {
  rules: RuleDocument | null
  providerConfig: ProviderConfig | null
  latestValidation: ValidationResult | null
  latestScan: ValidationResult | null
  selection: NodeSnapshot[]
}

export interface PluginStatusMessage {
  level: 'info' | 'error'
  message: string
}

export type PluginToUIMessage =
  | {
      type: 'state-loaded'
      payload: PluginStateSnapshot
    }
  | {
      type: 'selection-updated'
      payload: {
        selection: NodeSnapshot[]
      }
    }
  | {
      type: 'validation-request'
      payload: ValidationTask
    }
  | {
      type: 'scan-request'
      payload: ValidationTask
    }
  | {
      type: 'status'
      payload: PluginStatusMessage
    }

export type UIToPluginMessage =
  | {
      type: 'ui-ready'
    }
  | {
      type: 'save-rules'
      payload: {
        fileName: string
        markdown: string
      }
    }
  | {
      type: 'save-provider-config'
      payload: {
        config: ProviderConfig
      }
    }
  | {
      type: 'request-scan'
    }
  | {
      type: 'validation-complete'
      payload: {
        result: ValidationResult
      }
    }
  | {
      type: 'scan-complete'
      payload: {
        result: ValidationResult
      }
    }
