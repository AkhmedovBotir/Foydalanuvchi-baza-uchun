import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import {
  AddRounded,
  CloseRounded,
  DeleteOutlineRounded,
  EditRounded,
  PhoneRounded,
  SearchRounded,
} from '@mui/icons-material'
import { createAdmin, deleteAdmin, listAdmins, updateAdmin } from '../api/admins'
import { ApiError } from '../api/client'
import type { Admin } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import { useSnack } from '../ui/SnackProvider'
import { useConfirm } from '../ui/ConfirmProvider'
import { PhoneField } from '../ui/PhoneField'
import { PasswordField } from '../ui/PasswordField'
import { isValidUzPhone } from '../lib/phone'

const headingFont = { fontFamily: "'Outfit', sans-serif" }
const MotionPaper = motion.create(Paper)

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0 },
}

type AdminForm = {
  name: string
  phone: string
  username: string
  password: string
}

const emptyForm: AdminForm = {
  name: '',
  phone: '',
  username: '',
  password: '',
}

function formatDate(value: string) {
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleString('uz-UZ', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function initials(name: string) {
  return name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

export function AdminsPage() {
  const { admin, logout } = useAuth()
  const { showSnack } = useSnack()
  const confirm = useConfirm()
  const [admins, setAdmins] = useState<Admin[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<AdminForm>(emptyForm)
  const [saving, setSaving] = useState(false)

  const loadAdmins = async () => {
    setLoading(true)
    try {
      const data = await listAdmins()
      setAdmins(data ?? [])
    } catch (err) {
      showSnack(
        err instanceof ApiError ? err.message : 'Adminlar ro‘yxatini yuklab bo‘lmadi',
        'error',
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadAdmins()
  }, [])

  const filtered = (() => {
    const q = query.trim().toLowerCase()
    if (!q) return admins
    return admins.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.phone.toLowerCase().includes(q) ||
        u.username.toLowerCase().includes(q),
    )
  })()

  const openCreate = () => {
    setEditingId(null)
    setForm(emptyForm)
    setDialogOpen(true)
  }

  const openEdit = (item: Admin) => {
    setEditingId(item.id)
    setForm({
      name: item.name,
      phone: item.phone,
      username: item.username,
      password: '',
    })
    setDialogOpen(true)
  }

  const saveAdmin = async () => {
    if (!form.name.trim() || !form.phone.trim() || !form.username.trim()) {
      showSnack('Ism, telefon va login majburiy', 'warning')
      return
    }
    if (!isValidUzPhone(form.phone)) {
      showSnack('Telefon +998 90 123 45 67 formatida to‘liq bo‘lishi kerak', 'warning')
      return
    }

    if (editingId == null && form.password.length < 6) {
      showSnack('Parol kamida 6 ta belgidan iborat bo‘lishi kerak', 'warning')
      return
    }

    if (editingId != null && form.password && form.password.length < 6) {
      showSnack('Yangi parol kamida 6 ta belgidan iborat bo‘lishi kerak', 'warning')
      return
    }

    setSaving(true)
    try {
      if (editingId == null) {
        await createAdmin({
          name: form.name.trim(),
          phone: form.phone.trim(),
          username: form.username.trim(),
          password: form.password,
        })
        showSnack('Yangi admin yaratildi', 'success')
      } else {
        await updateAdmin(editingId, {
          name: form.name.trim(),
          phone: form.phone.trim(),
          username: form.username.trim(),
          password: form.password || undefined,
        })
        showSnack('Admin yangilandi', 'success')
      }
      setDialogOpen(false)
      await loadAdmins()
    } catch (err) {
      showSnack(err instanceof ApiError ? err.message : 'Saqlashda xato', 'error')
    } finally {
      setSaving(false)
    }
  }

  const removeAdmin = async (id: string) => {
    const ok = await confirm({
      title: 'Adminni o‘chirish',
      message: 'Bu adminni o‘chirishni tasdiqlaysizmi? Bu amalni qaytarib bo‘lmaydi.',
      confirmLabel: 'O‘chirish',
      danger: true,
    })
    if (!ok) return
    try {
      await deleteAdmin(id)
      showSnack('Admin o‘chirildi', 'success')
      if (admin?.id === id) {
        logout()
        return
      }
      await loadAdmins()
    } catch (err) {
      showSnack(err instanceof ApiError ? err.message : 'O‘chirishda xato', 'error')
    }
  }

  return (
    <>
      <motion.div
        variants={{
          hidden: {},
          show: { transition: { staggerChildren: 0.08 } },
        }}
        initial="hidden"
        animate="show"
        className="flex flex-col gap-5"
      >
        <motion.section
          variants={fadeUp}
          className="flex flex-col gap-4 rounded-[1.5rem] bg-slate-950 px-5 py-6 text-white sm:flex-row sm:items-end sm:justify-between sm:px-7"
        >
          <div>
            <Typography
              variant="h4"
              sx={{
                ...headingFont,
                fontWeight: 800,
                fontSize: { xs: '1.45rem', sm: '1.75rem' },
              }}
            >
              Adminlar ro‘yxati
            </Typography>
            <Typography className="!mt-2 !text-[0.9rem] !text-slate-300">
              Yangi admin qo‘shing, tahrirlang yoki o‘chiring
            </Typography>
          </div>
          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
            <Button
              variant="contained"
              startIcon={<AddRounded />}
              onClick={openCreate}
              sx={{
                bgcolor: 'white',
                color: '#0f766e',
                '&:hover': { bgcolor: '#f0fdfa' },
              }}
            >
              Yangi admin
            </Button>
          </motion.div>
        </motion.section>

        <motion.section
          variants={fadeUp}
          className="overflow-hidden rounded-[1.35rem] bg-white/90 shadow-sm ring-1 ring-slate-200/80 backdrop-blur"
        >
          <div className="border-b border-slate-100 p-3.5 sm:p-4">
            <TextField
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Qidirish: ism, telefon, login..."
              size="small"
              fullWidth
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchRounded fontSize="small" />
                    </InputAdornment>
                  ),
                },
              }}
              sx={{ maxWidth: { md: 420 } }}
            />
          </div>

          {loading ? (
            <Box className="grid place-items-center py-16">
              <CircularProgress />
            </Box>
          ) : (
            <div className="space-y-2.5 p-3 sm:p-4">
              <div className="hidden grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,0.8fr)_minmax(0,1fr)_88px] gap-3 px-3 text-[11px] font-bold uppercase tracking-[0.08em] text-slate-400 md:grid">
                <span>Admin</span>
                <span>Telefon</span>
                <span>Login</span>
                <span>Yaratilgan</span>
                <span className="text-right">Amallar</span>
              </div>

              <AnimatePresence initial={false} mode="popLayout">
                {filtered.map((item, index) => (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, y: 14, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, x: -30, scale: 0.96 }}
                    transition={{
                      delay: index * 0.03,
                      type: 'spring',
                      stiffness: 320,
                      damping: 28,
                    }}
                    whileHover={{ y: -2 }}
                    className="group grid grid-cols-1 items-center gap-3 rounded-2xl border border-slate-200/80 bg-gradient-to-r from-slate-50 to-white p-3.5 shadow-[0_1px_0_rgba(15,23,42,0.03)] transition-colors hover:border-teal-200 hover:from-teal-50/40 hover:to-white md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,0.8fr)_minmax(0,1fr)_88px] md:gap-3 md:px-3"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar
                        sx={{
                          bgcolor: 'primary.light',
                          color: 'primary.dark',
                          fontWeight: 700,
                          width: 40,
                          height: 40,
                          fontSize: 13,
                        }}
                      >
                        {initials(item.name)}
                      </Avatar>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900">
                          {item.name}
                        </p>
                        <p className="text-xs text-slate-400 md:hidden">Admin</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 text-sm text-slate-600">
                      <PhoneRounded sx={{ fontSize: 16, color: '#94a3b8' }} />
                      <span className="truncate">{item.phone}</span>
                    </div>

                    <div>
                      <Chip
                        size="small"
                        label={item.username}
                        sx={{
                          fontWeight: 600,
                          bgcolor: 'rgba(13,148,136,0.1)',
                          color: '#0f766e',
                          border: 'none',
                        }}
                      />
                    </div>

                    <div className="text-sm text-slate-500">
                      {formatDate(item.created_at)}
                    </div>

                    <div className="flex justify-end gap-1">
                      <Tooltip title="Tahrirlash">
                        <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                          <IconButton
                            size="small"
                            onClick={() => openEdit(item)}
                            sx={{
                              bgcolor: 'rgba(14,165,233,0.08)',
                              '&:hover': { bgcolor: 'rgba(14,165,233,0.16)' },
                            }}
                          >
                            <EditRounded fontSize="small" />
                          </IconButton>
                        </motion.div>
                      </Tooltip>
                      <Tooltip title="O‘chirish">
                        <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => void removeAdmin(item.id)}
                            sx={{
                              bgcolor: 'rgba(239,68,68,0.08)',
                              '&:hover': { bgcolor: 'rgba(239,68,68,0.16)' },
                            }}
                          >
                            <DeleteOutlineRounded fontSize="small" />
                          </IconButton>
                        </motion.div>
                      </Tooltip>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {filtered.length === 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="rounded-2xl border border-dashed border-slate-200 py-14 text-center"
                >
                  <Typography color="text.secondary">Admin topilmadi</Typography>
                </motion.div>
              )}
            </div>
          )}
        </motion.section>
      </motion.div>

      <Dialog
        open={dialogOpen}
        onClose={() => !saving && setDialogOpen(false)}
        fullWidth
        maxWidth="md"
        slots={{ paper: MotionPaper }}
        slotProps={{
          backdrop: {
            sx: {
              backgroundColor: 'rgba(15, 23, 42, 0.45)',
              backdropFilter: 'blur(4px)',
            },
          },
          paper: {
            initial: { opacity: 0, y: 28, scale: 0.96 },
            animate: { opacity: 1, y: 0, scale: 1 },
            transition: { type: 'spring', stiffness: 320, damping: 26 },
            elevation: 12,
            sx: {
              borderRadius: '22px',
              overflow: 'hidden',
              width: '100%',
              maxWidth: 640,
              m: 2,
              backgroundColor: '#fff',
              boxShadow: '0 24px 60px rgba(15,23,42,0.22)',
            },
          } as never,
        }}
      >
        <DialogTitle
          sx={{
            ...headingFont,
            fontWeight: 700,
            fontSize: '1.45rem',
            px: 3.5,
            pt: 3,
            pb: 1,
            pr: 7,
            position: 'relative',
          }}
        >
          {editingId == null ? 'Yangi admin' : 'Adminni tahrirlash'}
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75, fontWeight: 500 }}>
            {editingId == null
              ? 'Yangi admin hisobini yarating'
              : 'Ma’lumotlarni yangilang. Parolni bo‘sh qoldirsangiz o‘zgarmaydi.'}
          </Typography>
          <IconButton
            aria-label="Yopish"
            onClick={() => setDialogOpen(false)}
            disabled={saving}
            sx={{
              position: 'absolute',
              right: 14,
              top: 14,
              bgcolor: 'rgba(15,23,42,0.04)',
              '&:hover': { bgcolor: 'rgba(15,23,42,0.08)' },
            }}
          >
            <CloseRounded />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ px: 3.5, pt: 2.5, pb: 1 }}>
          <Stack spacing={2.5} sx={{ pt: 1 }}>
            <TextField
              label="Ism"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              fullWidth
              autoFocus
              required
            />
            <Box className="grid gap-2.5 sm:grid-cols-2">
              <PhoneField
                label="Telefon"
                value={form.phone}
                onChange={(phone) => setForm((f) => ({ ...f, phone }))}
                required
              />
              <TextField
                label="Login"
                value={form.username}
                onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
                fullWidth
                required
              />
            </Box>
            <PasswordField
              label={editingId == null ? 'Parol' : 'Yangi parol (ixtiyoriy)'}
              value={form.password}
              onChange={(password) => setForm((f) => ({ ...f, password }))}
              required={editingId == null}
              helperText={
                editingId == null
                  ? 'Kamida 6 belgi'
                  : 'Bo‘sh qoldirsangiz parol o‘zgarmaydi'
              }
              autoComplete="new-password"
            />
          </Stack>
        </DialogContent>

        <DialogActions sx={{ px: 3.5, pb: 3, pt: 2, gap: 1.25 }}>
          <Button
            onClick={() => setDialogOpen(false)}
            disabled={saving}
            size="large"
            sx={{ minWidth: 120 }}
          >
            Bekor qilish
          </Button>
          <Button
            variant="contained"
            onClick={() => void saveAdmin()}
            disabled={saving}
            size="large"
            sx={{ minWidth: 140 }}
          >
            {saving ? 'Saqlanmoqda...' : 'Saqlash'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
