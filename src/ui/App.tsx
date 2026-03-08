import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getDefaultBaseUrl, getDefaultModel } from '../llm/providerRegistry'
import type {
  ChatMessage,
  PluginStatusMessage,
  PluginToUIMessage,
  ProviderConfig,
  ProviderKind,
  RuleDocument,
  ValidationIssue,
  ValidationResult,
  ValidationTask,
} from '../shared/types'
import { postPluginMessage } from './bridge'
import { runRulesChat, runValidationTask } from './llmTasks'

const providerOptions: Array<{ value: ProviderKind; label: string }> = [
  { value: 'openai', label: 'OpenAI' },
  { value: 'anthropic', label: 'Anthropic' },
  { value: 'gemini', label: 'Gemini' },
  { value: 'ollama', label: 'Ollama' },
  { value: 'custom', label: 'Custom' },
]

function createProviderDraft(kind: ProviderKind = 'openai'): ProviderConfig {
  return {
    kind,
    model: getDefaultModel(kind),
    apiKey: '',
    baseUrl: getDefaultBaseUrl(kind),
    temperature: 0.2,
  }
}

function createChatMessage(role: ChatMessage['role'], content: string): ChatMessage {
  return {
    id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    role,
    content,
    createdAt: Date.now(),
  }
}

function isPluginMessage(value: unknown): value is PluginToUIMessage {
  return Boolean(value && typeof value === 'object' && 'type' in value)
}

function normalizeProviderConfig(config: ProviderConfig) {
  return {
    ...config,
    model: config.model.trim(),
    apiKey: config.apiKey.trim(),
    baseUrl: config.baseUrl.trim(),
    temperature: Number.isFinite(config.temperature) ? config.temperature : 0.2,
  }
}

function providerNeedsApiKey(kind: ProviderKind) {
  return kind !== 'ollama'
}

function isProviderReady(config: ProviderConfig | null) {
  if (!config) {
    return false
  }

  if (config.model.trim().length === 0) {
    return false
  }

  if (config.baseUrl.trim().length === 0 && config.kind !== 'gemini') {
    return false
  }

  if (providerNeedsApiKey(config.kind) && config.apiKey.trim().length === 0) {
    return false
  }

  return true
}

function sortIssues(issues: ValidationIssue[]) {
  const order = {
    error: 0,
    warning: 1,
    info: 2,
  }

  return [...issues].sort((left, right) => order[left.severity] - order[right.severity])
}

function App() {
  const [rules, setRules] = useState<RuleDocument | null>(null)
  const [providerConfig, setProviderConfig] = useState<ProviderConfig | null>(null)
  const [providerDraft, setProviderDraft] = useState<ProviderConfig>(() => createProviderDraft())
  const [selectionCount, setSelectionCount] = useState(0)
  const [latestValidation, setLatestValidation] = useState<ValidationResult | null>(null)
  const [latestScan, setLatestScan] = useState<ValidationResult | null>(null)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState('')
  const [status, setStatus] = useState<PluginStatusMessage | null>(null)
  const [isWorking, setIsWorking] = useState(false)
  const validationRequestRef = useRef<string>('')
  const scanRequestRef = useRef<string>('')
  const chatMessagesRef = useRef<ChatMessage[]>([])

  useEffect(() => {
    chatMessagesRef.current = chatMessages
  }, [chatMessages])

  const handleValidationTask = useCallback(async (task: ValidationTask, kind: 'validation' | 'scan') => {
    setIsWorking(true)

    try {
      const result = await runValidationTask(task)

      if (kind === 'validation') {
        if (validationRequestRef.current !== result.requestId) {
          return
        }
        setLatestValidation(result)
        postPluginMessage({
          type: 'validation-complete',
          payload: { result },
        })
        setStatus({
          level: 'info',
          message:
            result.issues.length > 0
              ? `${result.issues.length} live issue(s) detected.`
              : 'Live validation found no conflicts.',
        })
        return
      }

      if (scanRequestRef.current !== result.requestId) {
        return
      }

      setLatestScan(result)
      postPluginMessage({
        type: 'scan-complete',
        payload: { result },
      })
      setStatus({
        level: 'info',
        message:
          result.issues.length > 0
            ? `${result.issues.length} scan issue(s) detected.`
            : 'Scan completed with no conflicts.',
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown provider error.'
      setStatus({ level: 'error', message })
    } finally {
      setIsWorking(false)
    }
  }, [])

  const handlePluginMessage = useCallback(
    async (pluginMessage: PluginToUIMessage) => {
      switch (pluginMessage.type) {
        case 'state-loaded':
          setRules(pluginMessage.payload.rules)
          setProviderConfig(pluginMessage.payload.providerConfig)
          setProviderDraft(pluginMessage.payload.providerConfig ?? createProviderDraft())
          setLatestValidation(pluginMessage.payload.latestValidation)
          setLatestScan(pluginMessage.payload.latestScan)
          setSelectionCount(pluginMessage.payload.selection.length)
          return
        case 'selection-updated':
          setSelectionCount(pluginMessage.payload.selection.length)
          return
        case 'status':
          setStatus(pluginMessage.payload)
          return
        case 'validation-request':
          validationRequestRef.current = pluginMessage.payload.requestId
          setStatus({ level: 'info', message: 'Running live validation...' })
          await handleValidationTask(pluginMessage.payload, 'validation')
          return
        case 'scan-request':
          scanRequestRef.current = pluginMessage.payload.requestId
          setStatus({ level: 'info', message: 'Scanning the current page...' })
          await handleValidationTask(pluginMessage.payload, 'scan')
          return
      }
    },
    [handleValidationTask],
  )

  useEffect(() => {
    const handleMessage = (event: MessageEvent<{ pluginMessage?: unknown }>) => {
      const pluginMessage = event.data?.pluginMessage

      if (!isPluginMessage(pluginMessage)) {
        return
      }

      void handlePluginMessage(pluginMessage)
    }

    window.addEventListener('message', handleMessage)
    postPluginMessage({ type: 'ui-ready' })

    return () => {
      window.removeEventListener('message', handleMessage)
    }
  }, [handlePluginMessage])

  const rulesSummary = useMemo(() => {
    if (!rules) {
      return 'No rules uploaded yet.'
    }

    return `${rules.sections.length} parsed sections from ${rules.fileName}`
  }, [rules])

  async function handleRulesUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]

    if (!file) {
      return
    }

    const markdown = await file.text()

    postPluginMessage({
      type: 'save-rules',
      payload: {
        fileName: file.name,
        markdown,
      },
    })

    setStatus({ level: 'info', message: `Uploaded ${file.name}.` })
    event.target.value = ''
  }

  function handleProviderKindChange(kind: ProviderKind) {
    setProviderDraft((current) => ({
      ...createProviderDraft(kind),
      apiKey: current.apiKey,
    }))
  }

  function handleProviderField<K extends keyof ProviderConfig>(key: K, value: ProviderConfig[K]) {
    setProviderDraft((current) => ({
      ...current,
      [key]: value,
    }))
  }

  function handleProviderSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const config = normalizeProviderConfig(providerDraft)
    setProviderConfig(config)
    postPluginMessage({
      type: 'save-provider-config',
      payload: { config },
    })
    setStatus({ level: 'info', message: `${config.kind} configuration saved.` })
  }

  function handleScan() {
    postPluginMessage({ type: 'request-scan' })
  }

  async function handleChatSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!rules || !providerConfig || !isProviderReady(providerConfig) || chatInput.trim().length === 0) {
      return
    }

    const question = chatInput.trim()
    const userMessage = createChatMessage('user', question)

    setChatMessages((current) => [...current, userMessage])
    setChatInput('')
    setIsWorking(true)

    try {
      const answer = await runRulesChat({
        providerConfig,
        rules,
        question,
        messages: chatMessagesRef.current,
      })

      setChatMessages((current) => [
        ...current,
        createChatMessage('assistant', answer || 'No answer returned from the selected model.'),
      ])
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown provider error.'
      setChatMessages((current) => [
        ...current,
        createChatMessage('assistant', `Unable to answer right now: ${message}`),
      ])
      setStatus({ level: 'error', message })
    } finally {
      setIsWorking(false)
    }
  }

  const canRunLLM = Boolean(rules) && isProviderReady(providerConfig)
  const validationIssues = latestValidation ? sortIssues(latestValidation.issues) : []
  const scanIssues = latestScan ? sortIssues(latestScan.issues) : []

  return (
    <main className="app-shell">
      <header className="panel">
        <div className="panel-header">
          <h1>Figma Rules Plugin</h1>
          <span className={status?.level === 'error' ? 'status status-error' : 'status status-info'}>
            {status?.message ?? 'Ready'}
          </span>
        </div>
        <div className="meta-row">
          <span>{rulesSummary}</span>
          <span>{selectionCount} selected node(s)</span>
        </div>
      </header>

      <section className="panel">
        <div className="panel-header">
          <h2>Rules Upload</h2>
        </div>
        <label className="file-input">
          <span>Upload Markdown Rules</span>
          <input type="file" accept=".md,.markdown,text/markdown" onChange={handleRulesUpload} />
        </label>
        <div className="section-list">
          {rules?.sections.length ? (
            rules.sections.slice(0, 8).map((section) => (
              <article className="list-card" key={section.id}>
                <strong>{section.title}</strong>
                <p>{section.body || 'No details provided.'}</p>
              </article>
            ))
          ) : (
            <p className="empty-state">Upload a Markdown file to enable validation, scan, and chat.</p>
          )}
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <h2>Provider Configuration</h2>
        </div>
        <form className="form-grid" onSubmit={handleProviderSave}>
          <label>
            <span>Provider</span>
            <select
              value={providerDraft.kind}
              onChange={(event) => handleProviderKindChange(event.target.value as ProviderKind)}
            >
              {providerOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Model</span>
            <input
              value={providerDraft.model}
              onChange={(event) => handleProviderField('model', event.target.value)}
              placeholder="Model name"
            />
          </label>
          <label>
            <span>Base URL</span>
            <input
              value={providerDraft.baseUrl}
              onChange={(event) => handleProviderField('baseUrl', event.target.value)}
              placeholder="https://api.example.com"
            />
          </label>
          <label>
            <span>{providerNeedsApiKey(providerDraft.kind) ? 'API Key' : 'API Key (optional)'}</span>
            <input
              type="password"
              value={providerDraft.apiKey}
              onChange={(event) => handleProviderField('apiKey', event.target.value)}
              placeholder="Token"
            />
          </label>
          <label>
            <span>Temperature</span>
            <input
              type="number"
              min="0"
              max="1"
              step="0.1"
              value={providerDraft.temperature}
              onChange={(event) => handleProviderField('temperature', Number(event.target.value))}
            />
          </label>
          <button className="primary-button" type="submit">
            Save Provider
          </button>
        </form>
      </section>

      <section className="panel">
        <div className="panel-header">
          <h2>Rules Chat</h2>
        </div>
        <div className="chat-thread">
          {chatMessages.length > 0 ? (
            chatMessages.map((message) => (
              <article
                className={message.role === 'assistant' ? 'chat-bubble assistant' : 'chat-bubble user'}
                key={message.id}
              >
                <strong>{message.role === 'assistant' ? 'Assistant' : 'You'}</strong>
                <p>{message.content}</p>
              </article>
            ))
          ) : (
            <p className="empty-state">Ask the selected model how the uploaded rules should be interpreted.</p>
          )}
        </div>
        <form className="chat-form" onSubmit={handleChatSubmit}>
          <textarea
            value={chatInput}
            onChange={(event) => setChatInput(event.target.value)}
            placeholder="Ask about spacing, typography, components, or edge cases..."
            rows={4}
          />
          <button className="primary-button" disabled={!canRunLLM || isWorking} type="submit">
            Ask Rules
          </button>
        </form>
      </section>

      <section className="panel">
        <div className="panel-header">
          <h2>Validation</h2>
          <button className="primary-button" disabled={!canRunLLM || isWorking} onClick={handleScan} type="button">
            Scan Design
          </button>
        </div>
        <div className="results-grid">
          <article className="results-column">
            <h3>Live Findings</h3>
            {latestValidation ? (
              <>
                <p>{latestValidation.summary}</p>
                <ul className="issue-list">
                  {validationIssues.length > 0 ? (
                    validationIssues.map((issue, index) => (
                      <li className={`issue-card ${issue.severity}`} key={`${issue.nodeId}-${index}`}>
                        <strong>{issue.nodeName}</strong>
                        <p>{issue.message}</p>
                        <span>{issue.ruleTitle}</span>
                        {issue.suggestion ? <small>{issue.suggestion}</small> : null}
                      </li>
                    ))
                  ) : (
                    <li className="empty-state">No live conflicts detected.</li>
                  )}
                </ul>
              </>
            ) : (
              <p className="empty-state">Edit or create nodes in Figma to trigger live validation.</p>
            )}
          </article>
          <article className="results-column">
            <h3>Page Scan</h3>
            {latestScan ? (
              <>
                <p>{latestScan.summary}</p>
                <ul className="issue-list">
                  {scanIssues.length > 0 ? (
                    scanIssues.map((issue, index) => (
                      <li className={`issue-card ${issue.severity}`} key={`${issue.nodeId}-${index}`}>
                        <strong>{issue.nodeName}</strong>
                        <p>{issue.message}</p>
                        <span>{issue.ruleTitle}</span>
                        {issue.suggestion ? <small>{issue.suggestion}</small> : null}
                      </li>
                    ))
                  ) : (
                    <li className="empty-state">No scan conflicts detected.</li>
                  )}
                </ul>
              </>
            ) : (
              <p className="empty-state">Run a scan to analyze the current page against the rules.</p>
            )}
          </article>
        </div>
      </section>
    </main>
  )
}

export default App
