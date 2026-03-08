import { getChangedNodeSnapshots, getPageScanSnapshots, getSelectionSnapshots } from '../core/scan/nodeSnapshot'
import { parseRuleDocument } from '../core/rules/parser'
import { loadStoredRules, saveStoredRules } from '../core/rules/storage'
import { loadStoredProviderConfig, saveStoredProviderConfig } from '../llm/providerStorage'
import type {
  PluginStateSnapshot,
  PluginStatusMessage,
  PluginToUIMessage,
  ProviderConfig,
  RuleDocument,
  UIToPluginMessage,
  ValidationResult,
  ValidationTask,
} from '../shared/types'

const UI_OPTIONS = {
  width: 440,
  height: 760,
  title: 'Figma Rules Plugin',
  themeColors: true,
}

let rules: RuleDocument | null = null
let providerConfig: ProviderConfig | null = null
let latestValidation: ValidationResult | null = null
let latestScan: ValidationResult | null = null
let validationTimer: ReturnType<typeof setTimeout> | null = null
const changedNodeIds = new Set<string>()

function postToUI(message: PluginToUIMessage) {
  figma.ui.postMessage(message)
}

function notifyStatus(payload: PluginStatusMessage) {
  postToUI({
    type: 'status',
    payload,
  })
}

function createStateSnapshot(): PluginStateSnapshot {
  return {
    rules,
    providerConfig,
    latestValidation,
    latestScan,
    selection: getSelectionSnapshots(),
  }
}

function syncState() {
  postToUI({
    type: 'state-loaded',
    payload: createStateSnapshot(),
  })
}

function createRequestId(prefix: 'change' | 'scan') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function hasRules() {
  return Boolean(rules && rules.rawMarkdown.trim().length > 0)
}

function hasProviderConfig() {
  if (!providerConfig) {
    return false
  }

  if (providerConfig.model.trim().length === 0) {
    return false
  }

  if (providerConfig.kind !== 'gemini' && providerConfig.baseUrl.trim().length === 0) {
    return false
  }

  if (providerConfig.kind !== 'ollama' && providerConfig.apiKey.trim().length === 0) {
    return false
  }

  return true
}

function queueSelectionForValidation() {
  figma.currentPage.selection.forEach((node) => {
    changedNodeIds.add(node.id)
  })
  scheduleValidation()
}

function postSelection() {
  postToUI({
    type: 'selection-updated',
    payload: {
      selection: getSelectionSnapshots(),
    },
  })
}

function scheduleValidation() {
  if (validationTimer) {
    clearTimeout(validationTimer)
  }

  validationTimer = setTimeout(() => {
    void flushQueuedValidation()
  }, 700)
}

async function flushQueuedValidation() {
  validationTimer = null

  if (!hasRules()) {
    notifyStatus({
      level: 'info',
      message: 'Upload a Markdown rules file to enable live validation.',
    })
    return
  }

  if (!hasProviderConfig()) {
    notifyStatus({
      level: 'info',
      message: 'Save a model provider to enable live validation.',
    })
    return
  }

  const snapshots = getChangedNodeSnapshots(changedNodeIds)
  changedNodeIds.clear()

  if (snapshots.length === 0 || !rules || !providerConfig) {
    return
  }

  const task: ValidationTask = {
    requestId: createRequestId('change'),
    scope: 'change',
    pageName: figma.currentPage.name,
    snapshots,
    rules,
    providerConfig,
  }

  postToUI({
    type: 'validation-request',
    payload: task,
  })
}

async function runPageScan() {
  if (!hasRules()) {
    notifyStatus({
      level: 'info',
      message: 'Upload a Markdown rules file before scanning.',
    })
    return
  }

  if (!hasProviderConfig()) {
    notifyStatus({
      level: 'info',
      message: 'Save a model provider before scanning.',
    })
    return
  }

  const snapshots = getPageScanSnapshots()

  if (snapshots.length === 0 || !rules || !providerConfig) {
    notifyStatus({
      level: 'info',
      message: 'The current page does not contain scannable nodes.',
    })
    return
  }

  const task: ValidationTask = {
    requestId: createRequestId('scan'),
    scope: 'scan',
    pageName: figma.currentPage.name,
    snapshots,
    rules,
    providerConfig,
  }

  postToUI({
    type: 'scan-request',
    payload: task,
  })
}

function handleDocumentChange(event: DocumentChangeEvent) {
  event.documentChanges.forEach((change) => {
    if (change.origin === 'REMOTE') {
      return
    }

    if (change.type === 'CREATE' || change.type === 'PROPERTY_CHANGE') {
      changedNodeIds.add(change.id)
    }
  })

  if (changedNodeIds.size > 0) {
    scheduleValidation()
  }
}

function wireEvents() {
  figma.on('selectionchange', () => {
    postSelection()
  })

  figma.on('currentpagechange', () => {
    postSelection()
    notifyStatus({
      level: 'info',
      message: `Current page: ${figma.currentPage.name}`,
    })
  })

  figma.on('documentchange', handleDocumentChange)
}

async function handleValidationComplete(result: ValidationResult, scope: 'change' | 'scan') {
  if (scope === 'change') {
    latestValidation = result
    syncState()

    if (result.issues.length > 0) {
      figma.notify(`${result.issues.length} live issue(s) detected.`, {
        timeout: 1800,
      })
    }

    return
  }

  latestScan = result
  syncState()
  figma.notify(
    result.issues.length > 0
      ? `${result.issues.length} scan issue(s) detected.`
      : 'Scan completed with no conflicts.',
    { timeout: 2200 },
  )
}

async function handleUIMessage(message: UIToPluginMessage) {
  switch (message.type) {
    case 'ui-ready':
      syncState()
      return
    case 'save-rules': {
      rules = parseRuleDocument(message.payload.fileName, message.payload.markdown)
      await saveStoredRules(rules)
      syncState()
      notifyStatus({
        level: 'info',
        message: `${rules.fileName} loaded.`,
      })
      queueSelectionForValidation()
      return
    }
    case 'save-provider-config':
      providerConfig = message.payload.config
      await saveStoredProviderConfig(providerConfig)
      syncState()
      notifyStatus({
        level: 'info',
        message: `${providerConfig.kind} provider saved.`,
      })
      queueSelectionForValidation()
      return
    case 'request-scan':
      await runPageScan()
      return
    case 'validation-complete':
      await handleValidationComplete(message.payload.result, 'change')
      return
    case 'scan-complete':
      await handleValidationComplete(message.payload.result, 'scan')
      return
  }
}

async function bootstrap() {
  figma.showUI(__html__, UI_OPTIONS)
  await figma.loadAllPagesAsync()

  rules = await loadStoredRules()
  providerConfig = await loadStoredProviderConfig()

  figma.ui.onmessage = (message: UIToPluginMessage) => {
    void handleUIMessage(message)
  }

  wireEvents()
  postSelection()
  syncState()
}

void bootstrap()
