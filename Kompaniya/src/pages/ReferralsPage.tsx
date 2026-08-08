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
  FormControl,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import {
  AddRounded,
  ContactMailRounded,
  DeleteOutlineRounded,
  EditRounded,
  LocalHospitalRounded,
  PhoneRounded,
  RefreshRounded,
  SearchRounded,
  ShareRounded,
} from '@mui/icons-material'
import {
  createReferral,
  deleteReferral,
  detachCardFromReferral,
  listReferrals,
  updateReferral,
  type Referral,
} from '../api/referrals'
import { listAppointments } from '../api/appointments'
import type { AppointmentService } from '../api/appointmentTypes'
import { ApiError } from '../api/client'
import { useSnack } from '../ui/SnackProvider'
import { useConfirm } from '../ui/ConfirmProvider'
import { PhoneField } from '../ui/PhoneField'
import { isValidUzPhone } from '../lib/phone'
import { ReferralCardWorkspace } from '../components/cards/ReferralCardWorkspace'

const headingFont = { fontFamily: "'Outfit', sans-serif" }
const fadeUp = { hidden: { opacity: 0, y: 18 }, show: { opacity: 1, y: 0 } }

type Form = {
  name: string
  phone: string
  specialty: string
  serviceId: string
}

const empty: Form = { name: '', phone: '', specialty: '', serviceId: '' }

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

export function ReferralsPage() {
  const { showSnack } = useSnack()
  const confirm = useConfirm()
  const [items, setItems] = useState<Referral[]>([])
  const [services, setServices] = useState<AppointmentService[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [query, setQuery] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<Form>(empty)
  const [saving, setSaving] = useState(false)
  const [cardRef, setCardRef] = useState<Referral | null>(null)

  const load = async () => {
    try {
      const [refs, appts] = await Promise.all([
        listReferrals(),
        listAppointments().catch(() => [] as AppointmentService[]),
      ])
      setItems(refs ?? [])
      setServices(appts ?? [])
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
        (x.serviceTitle || '').toLowerCase().includes(q),
    )
  }, [items, query])

  const withCard = useMemo(() => items.filter((x) => x.cardId).length, [items])

  const openCreate = () => {
    setEditingId(null)
    setForm({
      ...empty,
      serviceId: services.find((s) => s.status === 'published')?.id || services[0]?.id || '',
    })
    setDialogOpen(true)
  }

  const openEdit = (item: Referral) => {
    setEditingId(item.id)
    setForm({
      name: item.name,
      phone: item.phone,
      specialty: item.specialty,
      serviceId: item.serviceId || '',
    })
    setDialogOpen(true)
  }

  const save = async () => {
    if (!form.name.trim() || !form.specialty.trim() || !form.phone.trim()) {
      showSnack('Ism, mutaxassislik va telefon majburiy', 'warning')
      return
    }
    if (!isValidUzPhone(form.phone)) {
      showSnack('Telefon +998 90 123 45 67 formatida to‘liq bo‘lishi kerak', 'warning')
      return
    }
    if (!form.serviceId) {
      showSnack('Vizitka QR uchun qabul xizmatini tanlang', 'warning')
      return
    }
    setSaving(true)
    try {
      const body = {
        name: form.name.trim(),
        phone: form.phone.trim(),
        specialty: form.specialty.trim(),
        serviceId: form.serviceId,
      }
      if (!editingId) {
        await createReferral(body)
        showSnack('Referal yaratildi', 'success')
      } else {
        await updateReferral(editingId, body)
        showSnack('Referal yangilandi', 'success')
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
      title: 'Referalni o‘chirish',
      message: 'Referal o‘chirilsinmi? Bu amalni qaytarib bo‘lmaydi.',
      confirmLabel: 'O‘chirish',
      danger: true,
    })
    if (!ok) return
    try {
      await deleteReferral(id)
      showSnack('O‘chirildi', 'success')
      await load()
    } catch (e) {
      showSnack(e instanceof ApiError ? e.message : 'Xato', 'error')
    }
  }

  const detach = async (item: Referral) => {
    if (!item.cardId) return
    const ok = await confirm({
      title: 'Vizitkani yechish',
      message: 'Vizitka yechilsinmi?',
      confirmLabel: 'Yechish',
      danger: true,
    })
    if (!ok) return
    try {
      await detachCardFromReferral(item.id)
      showSnack('Vizitka yechildi', 'success')
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
            Referallar
          </Typography>
          <Typography className="!mt-2 !text-[0.9rem] !text-slate-300">
            Ism, telefon, mutaxassislik — keyin vizitka orqali qabulga yo‘naltirish
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

      <section className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-teal-50 text-teal-700">
              <ShareRounded fontSize="small" />
            </span>
            <span className="text-2xl font-bold tabular-nums text-slate-900">{items.length}</span>
          </div>
          <p className="mt-2 text-sm font-medium text-slate-600">Jami referallar</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-sky-50 text-sky-700">
              <ContactMailRounded fontSize="small" />
            </span>
            <span className="text-2xl font-bold tabular-nums text-slate-900">{withCard}</span>
          </div>
          <p className="mt-2 text-sm font-medium text-slate-600">Vizitkali</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-slate-100 text-slate-600">
              <SearchRounded fontSize="small" />
            </span>
            <span className="text-2xl font-bold tabular-nums text-slate-900">{filtered.length}</span>
          </div>
          <p className="mt-2 text-sm font-medium text-slate-600">Qidiruv</p>
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
          placeholder="Qidirish: ism, mutaxassislik, telefon…"
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
          {items.length === 0
            ? 'Hali referal yo‘q — birinchisini qo‘shing'
            : 'Qidiruv bo‘yicha topilmadi'}
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
                  <Avatar sx={{ bgcolor: '#0d9488', fontWeight: 700 }}>{initials(item.name)}</Avatar>
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
                        bgcolor: 'rgba(13,148,136,0.1)',
                        color: '#0f766e',
                        fontWeight: 600,
                        '& .MuiChip-icon': { color: '#0d9488' },
                      }}
                    />
                    <p className="mt-1.5 flex items-center gap-1 text-sm text-slate-500">
                      <PhoneRounded sx={{ fontSize: 14 }} />
                      {item.phone}
                    </p>
                    {item.serviceTitle && (
                      <p className="mt-0.5 text-sm text-slate-500">Qabul: {item.serviceTitle}</p>
                    )}
                    {item.cardId ? (
                      <Chip size="small" label="Vizitka bor" color="success" variant="outlined" sx={{ mt: 1 }} />
                    ) : (
                      <Chip size="small" label="Vizitka yo‘q" variant="outlined" sx={{ mt: 1 }} />
                    )}
                    <p className="mt-2 text-[11px] text-slate-400">{formatDate(item.createdAt)}</p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap justify-end gap-1 border-t border-slate-100 pt-2">
                  <Button
                    size="small"
                    startIcon={<ContactMailRounded />}
                    onClick={() => setCardRef(item)}
                    sx={{ textTransform: 'none', fontWeight: 600 }}
                  >
                    Vizitka
                  </Button>
                  {item.cardId && (
                    <Button
                      size="small"
                      color="inherit"
                      onClick={() => void detach(item)}
                      sx={{ textTransform: 'none' }}
                    >
                      Yechish
                    </Button>
                  )}
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
          {editingId ? 'Referalni tahrirlash' : 'Yangi referal'}
        </DialogTitle>
        <DialogContent className="!flex !flex-col !gap-3 !pt-2">
          <TextField
            label="Ism familya"
            fullWidth
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
          <PhoneField
            label="Telefon raqam"
            value={form.phone}
            onChange={(phone) => setForm((f) => ({ ...f, phone }))}
            required
          />
          <TextField
            label="Mutaxassisligi"
            fullWidth
            value={form.specialty}
            onChange={(e) => setForm((f) => ({ ...f, specialty: e.target.value }))}
            placeholder="Masalan: Terapevt"
          />
          <FormControl fullWidth>
            <InputLabel>Qabul xizmati (vizitka QR)</InputLabel>
            <Select
              label="Qabul xizmati (vizitka QR)"
              value={form.serviceId}
              onChange={(e) => setForm((f) => ({ ...f, serviceId: e.target.value }))}
            >
              {services.map((s) => (
                <MenuItem key={s.id} value={s.id}>
                  {s.title} ({s.status})
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          {services.length === 0 && (
            <Typography variant="body2" color="warning.main">
              Avval «Qabul» bo‘limida xizmat yarating va nashr qiling.
            </Typography>
          )}
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

      <ReferralCardWorkspace
        open={Boolean(cardRef)}
        referral={cardRef}
        onClose={() => setCardRef(null)}
        onLinked={async () => {
          await load()
          if (cardRef) {
            const list = await listReferrals()
            const fresh = (list ?? []).find((x) => x.id === cardRef.id)
            if (fresh) setCardRef(fresh)
          }
        }}
      />
    </>
  )
}
