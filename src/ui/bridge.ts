import type { UIToPluginMessage } from '../shared/types'

export function postPluginMessage(message: UIToPluginMessage) {
  window.parent.postMessage({ pluginMessage: message }, '*')
}
