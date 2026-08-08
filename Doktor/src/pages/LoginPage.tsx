import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Box,
  Button,
  CircularProgress,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import {
  LockRounded,
  PersonRounded,
  VisibilityOffRounded,
  VisibilityRounded,
} from '@mui/icons-material'
import { ApiError } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { useSnack } from '../ui/SnackProvider'

export function LoginPage() {
  const { login } = useAuth()
  const { showSnack } = useSnack()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await login({ username: username.trim(), password })
      showSnack('Muvaffaqiyatli kirildi', 'success')
      navigate('/', { replace: true })
    } catch (err) {
      if (err instanceof ApiError) {
        showSnack(err.detail ? `${err.message}: ${err.detail}` : err.message, 'error')
      } else {
        showSnack('Serverga ulanishda xato. Keyinroq qayta urinib ko‘ring.', 'error')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Box className="grid min-h-svh place-items-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 24 }}
        className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-xl shadow-slate-900/10 ring-1 ring-slate-200/80"
      >
        <div className="relative overflow-hidden bg-slate-950 px-6 py-8 text-white">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(56,189,248,0.35),transparent_40%),radial-gradient(circle_at_90%_10%,rgba(45,212,191,0.25),transparent_35%)]" />
          <div className="relative">
            <Typography
              variant="h4"
              sx={{
                fontFamily: "'Outfit', sans-serif",
                fontWeight: 800,
                letterSpacing: '-0.03em',
              }}
            >
              Shifokor paneli
            </Typography>
            <Typography className="!mt-2 !text-slate-300">
              Kompaniya tomonidan berilgan login bilan kiring
            </Typography>
          </div>
        </div>

        <Box component="form" onSubmit={onSubmit} className="p-6 sm:p-7">
          <Stack spacing={2.2}>
            <TextField
              label="Login"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              fullWidth
              autoFocus
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <PersonRounded fontSize="small" />
                    </InputAdornment>
                  ),
                },
              }}
            />
            <TextField
              label="Parol"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              fullWidth
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockRounded fontSize="small" />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        edge="end"
                        onClick={() => setShowPassword((v) => !v)}
                        aria-label="Parolni ko‘rsatish"
                      >
                        {showPassword ? <VisibilityOffRounded /> : <VisibilityRounded />}
                      </IconButton>
                    </InputAdornment>
                  ),
                },
              }}
            />
            <Button
              type="submit"
              variant="contained"
              size="large"
              disabled={submitting}
              startIcon={submitting ? <CircularProgress size={18} color="inherit" /> : undefined}
            >
              {submitting ? 'Kirilmoqda…' : 'Kirish'}
            </Button>
          </Stack>
        </Box>
      </motion.div>
    </Box>
  )
}
