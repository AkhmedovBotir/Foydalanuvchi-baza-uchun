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

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0 },
}

const headingFont = { fontFamily: "'Outfit', sans-serif" }

type ProfileForm = {
  name: string
  phone: string
  username: string
  password: string
}

const emptyForm: ProfileForm = {
  name: '',
  phone: '',
  username: '',
  password: '',
}

export function ProfilePage() {
  const { company, setCompany } = useAuth()
  const { showSnack } = useSnack()
  const [profileForm, setProfileForm] = useState<ProfileForm>(emptyForm)
  const [profileSaving, setProfileSaving] = useState(false)

  useEffect(() => {
    if (!company) return
    setProfileForm({
      name: company.name,
      phone: company.phone,
      username: company.username,
      password: '',
    })
  }, [company])

  const saveProfile = async (e: FormEvent) => {
    e.preventDefault()
    setProfileSaving(true)
    try {
      const updated = await updateProfile({
        name: profileForm.name.trim(),
        phone: profileForm.phone.trim(),
        username: profileForm.username.trim(),
        password: profileForm.password || undefined,
      })
      setCompany(updated)
      setProfileForm((f) => ({ ...f, password: '' }))
      showSnack('Profil yangilandi', 'success')
    } catch (err) {
      showSnack(
        err instanceof ApiError ? err.message : 'Profilni yangilab bo‘lmadi',
        'error',
      )
    } finally {
      setProfileSaving(false)
    }
  }

  return (
    <motion.section
      variants={fadeUp}
      className="rounded-[1.35rem] bg-white p-5 shadow-sm ring-1 ring-slate-200/80 sm:p-6"
    >
      <Typography
        variant="h5"
        sx={{ ...headingFont, fontWeight: 700, mb: 1, fontSize: '1.35rem' }}
      >
        Profilni yangilash
      </Typography>
      <Typography variant="body2" color="text.secondary" className="!mb-5">
        Kompaniya ma’lumotlaringizni o‘zgartiring. Parolni bo‘sh qoldirsangiz, eski parol
        saqlanadi.
      </Typography>

      <Box component="form" onSubmit={saveProfile} className="max-w-xl">
        <Stack spacing={2}>
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.05 }}
          >
            <TextField
              label="Nomi"
              value={profileForm.name}
              onChange={(e) => setProfileForm((f) => ({ ...f, name: e.target.value }))}
              required
              fullWidth
            />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            <TextField
              label="Telefon"
              value={profileForm.phone}
              onChange={(e) => setProfileForm((f) => ({ ...f, phone: e.target.value }))}
              required
              fullWidth
            />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15 }}
          >
            <TextField
              label="Login"
              value={profileForm.username}
              onChange={(e) =>
                setProfileForm((f) => ({ ...f, username: e.target.value }))
              }
              required
              fullWidth
            />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <TextField
              label="Yangi parol (ixtiyoriy)"
              type="password"
              value={profileForm.password}
              onChange={(e) =>
                setProfileForm((f) => ({ ...f, password: e.target.value }))
              }
              fullWidth
              helperText="Bo‘sh qoldirsangiz eski parol saqlanadi"
            />
          </motion.div>
          <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}>
            <Button
              type="submit"
              variant="contained"
              disabled={profileSaving}
              startIcon={
                profileSaving ? <CircularProgress size={18} color="inherit" /> : undefined
              }
            >
              {profileSaving ? 'Saqlanmoqda...' : 'Profilni saqlash'}
            </Button>
          </motion.div>
        </Stack>
      </Box>
    </motion.section>
  )
}
