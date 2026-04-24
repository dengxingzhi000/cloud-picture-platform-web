import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from '@/react-app/App'
import '@/react-app/i18n'
import './style.css'
import './dark-mode.css'

if (!('global' in globalThis)) {
  ;(globalThis as typeof globalThis & { global: typeof globalThis }).global = globalThis
}

const rootElement = document.getElementById('app')

if (!rootElement) {
  throw new Error('Missing app root element')
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>
)
