import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './mast.css'
import './pick.css'
import './stage0.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
