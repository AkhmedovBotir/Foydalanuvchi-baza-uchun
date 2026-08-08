import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
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
          <BrowserRouter>
            <AuthProvider>
              <App />
            </AuthProvider>
          </BrowserRouter>
        </ConfirmProvider>
      </SnackProvider>
    </ThemeProvider>
  </StrictMode>,
)
