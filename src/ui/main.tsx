import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'
import App from './App'

function mountApp() {
  let rootElement = document.getElementById('root')

  if (!rootElement) {
    rootElement = document.createElement('div')
    rootElement.id = 'root'
    ;(document.body ?? document.documentElement).appendChild(rootElement)
  }

  createRoot(rootElement).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', mountApp, { once: true })
} else {
  mountApp()
}
