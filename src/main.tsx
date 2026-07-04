import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import { PreferencesProvider } from './hooks/PreferencesContext'
import { ToastProvider } from './hooks/useToast'
import { ToastContainer } from './components/ToastContainer'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <PreferencesProvider>
      <ToastProvider>
        <App />
        <ToastContainer />
      </ToastProvider>
    </PreferencesProvider>
  </React.StrictMode>,
)
