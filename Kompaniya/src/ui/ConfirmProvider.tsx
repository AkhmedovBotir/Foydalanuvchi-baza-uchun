import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from '@mui/material'

export type ConfirmOptions = {
  title?: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  /** destructive action (delete/cancel) */
  danger?: boolean
}

type ConfirmFn = (options: ConfirmOptions | string) => Promise<boolean>

type ConfirmContextValue = {
  confirm: ConfirmFn
}

const ConfirmContext = createContext<ConfirmContextValue | null>(null)

type Pending = {
  options: ConfirmOptions
  resolve: (value: boolean) => void
}

function normalize(options: ConfirmOptions | string): ConfirmOptions {
  if (typeof options === 'string') {
    return { message: options }
  }
  return options
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<Pending | null>(null)
  const pendingRef = useRef<Pending | null>(null)

  const close = useCallback((value: boolean) => {
    const current = pendingRef.current
    pendingRef.current = null
    setPending(null)
    current?.resolve(value)
  }, [])

  const confirm = useCallback<ConfirmFn>((options) => {
    return new Promise<boolean>((resolve) => {
      const next: Pending = { options: normalize(options), resolve }
      pendingRef.current = next
      setPending(next)
    })
  }, [])

  const value = useMemo(() => ({ confirm }), [confirm])
  const opts = pending?.options
  const open = Boolean(pending)

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      <Dialog
        open={open}
        onClose={() => close(false)}
        fullWidth
        maxWidth="xs"
        slotProps={{
          paper: {
            sx: {
              borderRadius: 3,
              overflow: 'hidden',
            },
          },
        }}
      >
        <DialogTitle
          sx={{
            fontFamily: "'Outfit', 'Manrope', sans-serif",
            fontWeight: 800,
            fontSize: '1.15rem',
            pb: 0.5,
          }}
        >
          {opts?.title || 'Tasdiqlash'}
        </DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <Typography sx={{ color: 'text.secondary', lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>
            {opts?.message}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 2.5, pb: 2, gap: 1 }}>
          <Button onClick={() => close(false)} sx={{ textTransform: 'none', fontWeight: 600 }}>
            {opts?.cancelLabel || 'Bekor'}
          </Button>
          <Button
            variant="contained"
            color={opts?.danger ? 'error' : 'primary'}
            onClick={() => close(true)}
            autoFocus
            sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2, px: 2 }}
          >
            {opts?.confirmLabel || 'Tasdiqlash'}
          </Button>
        </DialogActions>
      </Dialog>
    </ConfirmContext.Provider>
  )
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext)
  if (!ctx) throw new Error('useConfirm ConfirmProvider ichida ishlatilishi kerak')
  return ctx.confirm
}
