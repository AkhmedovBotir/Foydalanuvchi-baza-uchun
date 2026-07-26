import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ThemeProvider, CssBaseline } from '@mui/material'
import './index.css'
import App from './App.tsx'
import { theme } from './theme'
import { AuthProvider } from './auth/AuthContext'
import { SnackProvider } from './ui/SnackProvider'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <SnackProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </SnackProvider>
    </ThemeProvider>
  </StrictMode>,
)
