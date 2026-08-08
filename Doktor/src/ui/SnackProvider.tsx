import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from 'react'
import { Alert, Snackbar } from '@mui/material'

type SnackSeverity = 'success' | 'error' | 'info' | 'warning'

type SnackState = {
  message: string
  severity: SnackSeverity
} | null

type SnackContextValue = {
  showSnack: (message: string, severity?: SnackSeverity) => void
}

const SnackContext = createContext<SnackContextValue | null>(null)

export function SnackProvider({ children }: { children: ReactNode }) {
  const [snack, setSnack] = useState<SnackState>(null)

  const showSnack = useCallback((message: string, severity: SnackSeverity = 'info') => {
    setSnack({ message, severity })
  }, [])

  return (
    <SnackContext.Provider value={{ showSnack }}>
      {children}
      <Snackbar
        open={Boolean(snack)}
        autoHideDuration={2800}
        onClose={() => setSnack(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        {snack ? (
          <Alert
            onClose={() => setSnack(null)}
            severity={snack.severity}
            variant="filled"
            sx={{ width: '100%', borderRadius: '12px', fontWeight: 600 }}
          >
            {snack.message}
          </Alert>
        ) : undefined}
      </Snackbar>
    </SnackContext.Provider>
  )
}

export function useSnack() {
  const ctx = useContext(SnackContext)
  if (!ctx) throw new Error('useSnack SnackProvider ichida ishlatilishi kerak')
  return ctx
}
