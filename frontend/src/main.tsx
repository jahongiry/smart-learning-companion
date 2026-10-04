import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import CaptchaProvider from './components/CaptchaProvider'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <CaptchaProvider>
        <App />
      </CaptchaProvider>
    </BrowserRouter>
  </StrictMode>,
)
