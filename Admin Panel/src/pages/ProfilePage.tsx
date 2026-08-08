import { useEffect, useState, type FormEvent } from 'react'
import { motion } from 'framer-motion'
import {
  Box,
  Button,
  CircularProgress,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { updateProfile } from '../api/auth'
import { ApiError } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { useSnack } from '../ui/SnackProvider'
import { PhoneField } from '../ui/PhoneField'
import { PasswordField } from '../ui/PasswordField'
import { isValidUzPhone } from '../lib/phone'

const headingFont = { fontFamily: "'Outfit', sans-serif" }

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0 },
}

type ProfileForm = {
  name: string
  phone: string
  username: string
  password: string
}

export function ProfilePage() {
  const { admin, setAdmin } = useAuth()
  const { showSnack } = useSnack()
  const [form, setForm] = useState<ProfileForm>({
    name: '',
    phone: '',
    username: '',
    password: '',
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!admin) return
    setForm({
      name: admin.name,
      phone: admin.phone,
      username: admin.username,
      password: '',
    })
  }, [admin])

  const saveProfile = async (e: FormEvent) => {
    e.preventDefault()
    if (!isValidUzPhone(form.phone)) {
      showSnack('Telefon +998 90 123 45 67 formatida to‘liq bo‘lishi kerak', 'warning')
      return
    }
    setSaving(true)
    try {
      const updated = await updateProfile({
        name: form.name.trim(),
        phone: form.phone.trim(),
        username: form.username.trim(),
        password: form.password || undefined,
      })
      setAdmin(updated)
      setForm((f) => ({ ...f, password: '' }))
      showSnack('Profil yangilandi', 'success')
    } catch (err) {
      showSnack(
        err instanceof ApiError ? err.message : 'Profilni yangilab bo‘lmadi',
        'error',
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <motion.section
      variants={fadeUp}
      initial="hidden"
      animate="show"
      className="rounded-[1.35rem] bg-white p-5 shadow-sm ring-1 ring-slate-200/80 sm:p-6"
    >
      <Typography
        variant="h5"
        sx={{ ...headingFont, fontWeight: 700, mb: 1, fontSize: '1.35rem' }}
      >
        Profilni yangilash
      </Typography>
      <Typography variant="body2" color="text.secondary" className="!mb-5">
        Shaxsiy ma’lumotlaringizni o‘zgartiring. Parolni bo‘sh qoldirsangiz, eski parol saqlanadi.
      </Typography>

      <Box component="form" onSubmit={saveProfile} className="max-w-xl">
        <Stack spacing={2}>
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.05 }}
          >
            <TextField
              label="Ism"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
              fullWidth
            />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            <PhoneField
              label="Telefon"
              value={form.phone}
              onChange={(phone) => setForm((f) => ({ ...f, phone }))}
              required
            />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15 }}
          >
            <TextField
              label="Login"
              value={form.username}
              onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
              required
              fullWidth
            />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <PasswordField
              label="Yangi parol (ixtiyoriy)"
              value={form.password}
              onChange={(password) => setForm((f) => ({ ...f, password }))}
              helperText="Bo‘sh qoldirsangiz eski parol saqlanadi"
              autoComplete="new-password"
            />
          </motion.div>
          <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}>
            <Button
              type="submit"
              variant="contained"
              disabled={saving}
              startIcon={
                saving ? <CircularProgress size={18} color="inherit" /> : undefined
              }
            >
              {saving ? 'Saqlanmoqda...' : 'Profilni saqlash'}
            </Button>
          </motion.div>
        </Stack>
      </Box>
    </motion.section>
  )
}
