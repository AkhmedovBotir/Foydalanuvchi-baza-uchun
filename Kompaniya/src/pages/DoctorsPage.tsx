import { useEffect, useMemo, useState } from 'react'
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
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import {
  AddRounded,
  BadgeRounded,
  DeleteOutlineRounded,
  EditRounded,
  LocalHospitalRounded,
  PhoneRounded,
  RefreshRounded,
  SearchRounded,
} from '@mui/icons-material'
import {
  createDoctor,
  deleteDoctor,
  listDoctors,
  updateDoctor,
  type Doctor,
} from '../api/staff'
import { ApiError } from '../api/client'
import { useSnack } from '../ui/SnackProvider'
import { useConfirm } from '../ui/ConfirmProvider'
import { PhoneField } from '../ui/PhoneField'
import { PasswordField } from '../ui/PasswordField'
import { isValidUzPhone } from '../lib/phone'

const headingFont = { fontFamily: "'Outfit', sans-serif" }
const fadeUp = { hidden: { opacity: 0, y: 18 }, show: { opacity: 1, y: 0 } }

type Form = {
  name: string
  specialty: string
  phone: string
  username: string
  password: string
}

const empty: Form = {
  name: '',
  specialty: '',
  phone: '',
  username: '',
  password: '',
}

function initials(name: string) {
  return name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

function formatDate(value: string) {
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleDateString('uz-UZ', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function DoctorsPage() {
  const { showSnack } = useSnack()
  const confirm = useConfirm()
  const [items, setItems] = useState<Doctor[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [query, setQuery] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<Form>(empty)
  const [saving, setSaving] = useState(false)

  const load = async () => {
    try {
      setItems((await listDoctors()) ?? [])
    } catch (e) {
      showSnack(e instanceof ApiError ? e.message : 'Yuklashda xato', 'error')
    }
  }

  useEffect(() => {
    setLoading(true)
    void load().finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return items
    return items.filter(
      (x) =>
        x.name.toLowerCase().includes(q) ||
        x.specialty.toLowerCase().includes(q) ||
        x.phone.toLowerCase().includes(q) ||
        x.username.toLowerCase().includes(q),
    )
  }, [items, query])

  const specialties = useMemo(
    () => new Set(items.map((d) => d.specialty.trim()).filter(Boolean)).size,
    [items],
  )

  const openCreate = () => {
    setEditingId(null)
    setForm(empty)
    setDialogOpen(true)
  }

  const openEdit = (item: Doctor) => {
    setEditingId(item.id)
    setForm({
      name: item.name,
      specialty: item.specialty,
      phone: item.phone,
      username: item.username,
      password: '',
    })
    setDialogOpen(true)
  }

  const save = async () => {
    if (
      !form.name.trim() ||
      !form.specialty.trim() ||
      !form.phone.trim() ||
      !form.username.trim()
    ) {
      showSnack('Ism, soha, telefon va username majburiy', 'warning')
      return
    }
    if (!isValidUzPhone(form.phone)) {
      showSnack('Telefon +998 90 123 45 67 formatida to‘liq bo‘lishi kerak', 'warning')
      return
    }
    if (!editingId && form.password.length < 6) {
      showSnack('Parol kamida 6 belgi', 'warning')
      return
    }
    if (editingId && form.password && form.password.length < 6) {
      showSnack('Yangi parol kamida 6 belgi', 'warning')
      return
    }
    setSaving(true)
    try {
      if (!editingId) {
        await createDoctor({
          name: form.name.trim(),
          specialty: form.specialty.trim(),
          phone: form.phone.trim(),
          username: form.username.trim(),
          password: form.password,
        })
        showSnack('Shifokor yaratildi', 'success')
      } else {
        await updateDoctor(editingId, {
          name: form.name.trim(),
          specialty: form.specialty.trim(),
          phone: form.phone.trim(),
          username: form.username.trim(),
          password: form.password || undefined,
        })
        showSnack('Shifokor yangilandi', 'success')
      }
      setDialogOpen(false)
      await load()
    } catch (e) {
      showSnack(e instanceof ApiError ? e.message : 'Saqlashda xato', 'error')
    } finally {
      setSaving(false)
    }
  }

  const remove = async (id: string) => {
    const ok = await confirm({
      title: 'Shifokorni o‘chirish',
      message: 'Shifokor o‘chirilsinmi? Bu amalni qaytarib bo‘lmaydi.',
      confirmLabel: 'O‘chirish',
      danger: true,
    })
    if (!ok) return
    try {
      await deleteDoctor(id)
      showSnack('O‘chirildi', 'success')
      await load()
    } catch (e) {
      showSnack(e instanceof ApiError ? e.message : 'Xato', 'error')
    }
  }

  return (
    <>
      <motion.section
        variants={fadeUp}
        initial="hidden"
        animate="show"
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
            Shifokorlar
          </Typography>
          <Typography className="!mt-2 !text-[0.9rem] !text-slate-300">
            Ism, soha, telefon, login va parol — har bir shifokor alohida hisob
          </Typography>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outlined"
            startIcon={
              refreshing ? <CircularProgress size={16} color="inherit" /> : <RefreshRounded />
            }
            disabled={refreshing}
            onClick={() => {
              setRefreshing(true)
              void load().finally(() => setRefreshing(false))
            }}
            sx={{
              borderColor: 'rgba(255,255,255,0.3)',
              color: 'white',
              textTransform: 'none',
              fontWeight: 600,
              '&:hover': { borderColor: 'white', bgcolor: 'rgba(255,255,255,0.08)' },
            }}
          >
            Yangilash
          </Button>
          <Button
            variant="contained"
            startIcon={<AddRounded />}
            onClick={openCreate}
            sx={{
              bgcolor: 'white',
              color: '#0f766e',
              textTransform: 'none',
              fontWeight: 700,
              '&:hover': { bgcolor: '#f0fdfa' },
            }}
          >
            Qo‘shish
          </Button>
        </div>
      </motion.section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-sky-50 text-sky-700">
              <LocalHospitalRounded fontSize="small" />
            </span>
            <span className="text-2xl font-bold tabular-nums text-slate-900">
              {items.length}
            </span>
          </div>
          <p className="mt-2 text-sm font-medium text-slate-600">Jami shifokorlar</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-teal-50 text-teal-700">
              <BadgeRounded fontSize="small" />
            </span>
            <span className="text-2xl font-bold tabular-nums text-slate-900">{specialties}</span>
          </div>
          <p className="mt-2 text-sm font-medium text-slate-600">Sohalar soni</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-slate-100 text-slate-600">
              <SearchRounded fontSize="small" />
            </span>
            <span className="text-2xl font-bold tabular-nums text-slate-900">
              {filtered.length}
            </span>
          </div>
          <p className="mt-2 text-sm font-medium text-slate-600">Qidiruv natijasi</p>
        </div>
      </section>

      <motion.section
        variants={fadeUp}
        initial="hidden"
        animate="show"
        className="rounded-[1.35rem] bg-white p-3.5 shadow-sm ring-1 ring-slate-200/80 sm:p-4"
      >
        <TextField
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Qidirish: ism, soha, telefon, login…"
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
      </motion.section>

      {loading ? (
        <Box className="grid place-items-center py-16">
          <CircularProgress />
        </Box>
      ) : filtered.length === 0 ? (
        <div className="rounded-[1.35rem] border border-dashed border-slate-200 bg-white py-16 text-center text-slate-500 shadow-sm">
          {items.length === 0 ? 'Hali shifokor yo‘q — birinchisini qo‘shing' : 'Qidiruv bo‘yicha topilmadi'}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <AnimatePresence mode="popLayout">
            {filtered.map((item) => (
              <motion.article
                key={item.id}
                layout
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="rounded-[1.35rem] border border-slate-200/90 bg-white p-4 shadow-sm ring-1 ring-slate-200/60"
              >
                <div className="flex items-start gap-3">
                  <Avatar sx={{ bgcolor: '#0284c7', fontWeight: 700 }}>
                    {initials(item.name)}
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-slate-900">{item.name}</p>
                    <Chip
                      size="small"
                      icon={<LocalHospitalRounded sx={{ fontSize: '14px !important' }} />}
                      label={item.specialty}
                      sx={{
                        mt: 0.75,
                        height: 24,
                        maxWidth: '100%',
                        bgcolor: 'rgba(14,165,233,0.1)',
                        color: '#0369a1',
                        fontWeight: 600,
                        '& .MuiChip-icon': { color: '#0284c7' },
                      }}
                    />
                    <p className="mt-1.5 flex items-center gap-1 text-sm text-slate-500">
                      <PhoneRounded sx={{ fontSize: 14 }} />
                      {item.phone}
                    </p>
                    <p className="mt-0.5 flex items-center gap-1 text-sm text-slate-500">
                      <BadgeRounded sx={{ fontSize: 14 }} />@{item.username}
                    </p>
                    <p className="mt-2 text-[11px] text-slate-400">
                      {formatDate(item.createdAt)}
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex justify-end gap-0.5 border-t border-slate-100 pt-2">
                  <Tooltip title="Tahrirlash">
                    <IconButton size="small" onClick={() => openEdit(item)}>
                      <EditRounded fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="O‘chirish">
                    <IconButton size="small" color="error" onClick={() => void remove(item.id)}>
                      <DeleteOutlineRounded fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </div>
              </motion.article>
            ))}
          </AnimatePresence>
        </div>
      )}

      <Dialog open={dialogOpen} onClose={() => !saving && setDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ ...headingFont, fontWeight: 700 }}>
          {editingId ? 'Shifokorni tahrirlash' : 'Yangi shifokor'}
        </DialogTitle>
        <DialogContent className="!flex !flex-col !gap-3 !pt-2">
          <TextField
            label="Ism"
            fullWidth
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
          <TextField
            label="Sohasi"
            fullWidth
            value={form.specialty}
            onChange={(e) => setForm((f) => ({ ...f, specialty: e.target.value }))}
            placeholder="Masalan: Terapevt, Stomatolog"
          />
          <PhoneField
            label="Telefon raqam"
            value={form.phone}
            onChange={(phone) => setForm((f) => ({ ...f, phone }))}
            required
          />
          <TextField
            label="Username"
            fullWidth
            value={form.username}
            onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
            autoComplete="off"
          />
          <PasswordField
            label={editingId ? 'Yangi parol (ixtiyoriy)' : 'Parol'}
            value={form.password}
            onChange={(password) => setForm((f) => ({ ...f, password }))}
            helperText={editingId ? 'Bo‘sh qoldirilsa o‘zgarmaydi' : 'Kamida 6 belgi'}
            autoComplete="new-password"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)} disabled={saving} sx={{ textTransform: 'none' }}>
            Bekor
          </Button>
          <Button
            variant="contained"
            onClick={() => void save()}
            disabled={saving}
            sx={{ textTransform: 'none', fontWeight: 700 }}
          >
            {saving ? '…' : 'Saqlash'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
