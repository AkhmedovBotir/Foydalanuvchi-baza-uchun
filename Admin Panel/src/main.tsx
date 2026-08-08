import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ThemeProvider, CssBaseline } from '@mui/material'
import './index.css'
import App from './App.tsx'
import { theme } from './theme'
import { AuthProvider } from './auth/AuthContext'
import { SnackProvider } from './ui/SnackProvider'
import { ConfirmProvider } from './ui/ConfirmProvider'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <SnackProvider>
        <ConfirmProvider>
          <AuthProvider>
            <App />
          </AuthProvider>
        </ConfirmProvider>
      </SnackProvider>
    </ThemeProvider>
  </StrictMode>,
)
