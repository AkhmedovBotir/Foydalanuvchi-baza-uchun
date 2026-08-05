import { useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  MenuItem,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import {
  AddRounded,
  ContactMailRounded,
  ContentCopyRounded,
  DeleteOutlineRounded,
  EditRounded,
  EventAvailableRounded,
  LinkOffRounded,
  OpenInNewRounded,
  PublishRounded,
  RefreshRounded,
  ScheduleRounded,
  StopCircleRounded,
} from '@mui/icons-material'
import {
  closeAppointment,
  createAppointment,
  deleteAppointment,
  detachCardFromAppointment,
  listAppointments,
  listBookings,
  publishAppointment,
  updateAppointment,
  updateBooking,
  getBookingSummary,
} from '../api/appointments'
import { getCard } from '../api/cards'
import {
  APPOINTMENT_STATUS_META,
  BOOKING_STATUS_META,
  WEEKDAY_LABELS,
  defaultSchedule,
  type AppointmentBooking,
  type AppointmentService,
  type BookingStatus,
  type DaySchedule,
  type UpsertAppointmentPayload,
  type BookingSummary,
} from '../api/appointmentTypes'
import { ApiError } from '../api/client'
import { useSnack } from '../ui/SnackProvider'
import { AppointmentCardWorkspace } from '../components/cards/AppointmentCardWorkspace'

const headingFont = { fontFamily: "'Outfit', sans-serif" }
const INTERVAL_OPTIONS = [15, 20, 30, 45, 60, 90, 120]

function slugify(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/['']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

function emptyForm(): UpsertAppointmentPayload & { schedule: DaySchedule[] } {
  return {
    title: '',
    slug: '',
    description: '',
    slotIntervalMinutes: 30,
    maxDaysAhead: 30,
    schedule: defaultSchedule(),
  }
}

export function AppointmentsPage() {
  const { showSnack } = useSnack()
  const [items, setItems] = useState<AppointmentService[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [editorOpen, setEditorOpen] = useState(false)
  const [editing, setEditing] = useState<AppointmentService | null>(null)
  const [form, setForm] = useState(emptyForm())

  const [cardWorkspace, setCardWorkspace] = useState<AppointmentService | null>(null)
  const [cardLabels, setCardLabels] = useState<Record<string, string>>({})

  const [bookingsOpen, setBookingsOpen] = useState(false)
  const [activeService, setActiveService] = useState<AppointmentService | null>(null)
  const [bookings, setBookings] = useState<AppointmentBooking[]>([])
  const [bookingStatus, setBookingStatus] = useState('')
  const [summary, setSummary] = useState<BookingSummary | null>(null)
  const [bookingsLoading, setBookingsLoading] = useState(false)

  const [concludeItem, setConcludeItem] = useState<AppointmentBooking | null>(null)
  const [conclusion, setConclusion] = useState('')
  const [bookingActionStatus, setBookingActionStatus] = useState<BookingStatus>('completed')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const list = (await listAppointments()) ?? []
      setItems(list)
      const labels: Record<string, string> = {}
      await Promise.all(
        list
          .filter((s) => s.cardId)
          .map(async (s) => {
            try {
              const c = await getCard(s.cardId!)
              labels[s.cardId!] = c.name
            } catch {
              labels[s.cardId!] = s.cardId!.slice(0, 8)
            }
          }),
      )
      setCardLabels(labels)
    } catch (e) {
      showSnack(e instanceof ApiError ? e.message : 'Yuklashda xato', 'error')
    } finally {
      setLoading(false)
    }
  }, [showSnack])

  useEffect(() => {
    void load()
  }, [load])

  const openCreate = () => {
    setEditing(null)
    setForm(emptyForm())
    setEditorOpen(true)
  }

  const openEdit = (s: AppointmentService) => {
    setEditing(s)
    setForm({
      title: s.title,
      slug: s.slug,
      description: s.description,
      slotIntervalMinutes: s.slotIntervalMinutes,
      maxDaysAhead: s.maxDaysAhead,
      schedule: s.schedule?.length ? s.schedule : defaultSchedule(),
    })
    setEditorOpen(true)
  }

  const saveForm = async () => {
    if (!form.title.trim() || !form.slug.trim()) {
      showSnack('Sarlavha va slug majburiy', 'warning')
      return
    }
    setSaving(true)
    try {
      const payload: UpsertAppointmentPayload = {
        ...form,
        title: form.title.trim(),
        slug: form.slug.trim().toLowerCase(),
        description: form.description?.trim() || '',
      }
      if (editing) {
        await updateAppointment(editing.id, payload)
        showSnack('Qabul yangilandi', 'success')
      } else {
        await createAppointment(payload)
        showSnack('Qabul yaratildi', 'success')
      }
      setEditorOpen(false)
      await load()
    } catch (e) {
      showSnack(e instanceof ApiError ? e.message : 'Saqlashda xato', 'error')
    } finally {
      setSaving(false)
    }
  }

  const loadBookings = useCallback(
    async (svc: AppointmentService, status = bookingStatus) => {
      setBookingsLoading(true)
      try {
        const [res, sum] = await Promise.all([
          listBookings({ service: svc.id, status: status || undefined, limit: 50 }),
          getBookingSummary(svc.id),
        ])
        setBookings(res.data ?? [])
        setSummary(sum)
      } catch (e) {
        showSnack(e instanceof ApiError ? e.message : 'Bronlar yuklanmadi', 'error')
      } finally {
        setBookingsLoading(false)
      }
    },
    [bookingStatus, showSnack],
  )

  const openBookings = (svc: AppointmentService) => {
    setActiveService(svc)
    setBookingsOpen(true)
    void loadBookings(svc)
  }

  return (
    <Box className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Typography sx={{ ...headingFont, fontWeight: 700, fontSize: '1.65rem' }}>
            Qabul
          </Typography>
          <Typography className="!mt-1 !text-sm !text-slate-500">
            Qabul kunlari, vaqt oraliglari, vizitka/QR va bronlarni boshqaring
          </Typography>
        </div>
        <div className="flex gap-2">
          <Button startIcon={<RefreshRounded />} onClick={() => void load()} variant="outlined">
            Yangilash
          </Button>
          <Button startIcon={<AddRounded />} variant="contained" onClick={openCreate}>
            Yangi qabul
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <CircularProgress />
        </div>
      ) : items.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/80 px-6 py-16 text-center"
        >
          <EventAvailableRounded className="!mb-3 !text-4xl !text-teal-600" />
          <Typography className="!font-semibold">Hali qabul yo‘q</Typography>
          <Typography className="!mt-1 !text-sm !text-slate-500">
            Kunlar, ish vaqti va slot oralig‘ini belgilab, nashr qiling
          </Typography>
          <Button className="!mt-4" variant="contained" onClick={openCreate}>
            Birinchisini yarating
          </Button>
        </motion.div>
      ) : (
        <div className="grid gap-5">
          {items.map((s, index) => {
            const st = APPOINTMENT_STATUS_META[s.status]
            const workDays = (s.schedule || []).filter((d) => d.enabled)
            const statusAccent =
              s.status === 'published'
                ? 'from-teal-500/20 via-cyan-500/10 to-transparent'
                : s.status === 'draft'
                  ? 'from-slate-400/15 via-slate-200/10 to-transparent'
                  : 'from-rose-400/15 via-orange-200/10 to-transparent'
            const statusBar =
              s.status === 'published'
                ? 'bg-teal-500'
                : s.status === 'draft'
                  ? 'bg-slate-400'
                  : 'bg-rose-500'

            return (
              <motion.article
                key={s.id}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(index * 0.04, 0.2) }}
                className="group relative overflow-hidden rounded-[1.35rem] border border-slate-200/80 bg-white shadow-[0_8px_30px_-12px_rgba(15,23,42,0.12)]"
              >
                <div
                  className={`pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b ${statusAccent}`}
                />
                <div className={`absolute left-0 top-0 h-full w-1 ${statusBar}`} />

                <div className="relative space-y-4 p-5 sm:p-6">
                  {/* header */}
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <Typography
                          sx={{
                            ...headingFont,
                            fontWeight: 800,
                            fontSize: { xs: '1.2rem', sm: '1.35rem' },
                            letterSpacing: '-0.02em',
                            color: '#0f172a',
                          }}
                        >
                          {s.title}
                        </Typography>
                        <span
                          className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide"
                          style={{ backgroundColor: st.bg, color: st.color }}
                        >
                          {st.label}
                        </span>
                      </div>
                      <p className="mt-1.5 font-mono text-xs text-slate-400">/{s.slug}</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      {s.status === 'draft' && (
                        <Button
                          size="small"
                          variant="contained"
                          color="success"
                          startIcon={<PublishRounded />}
                          onClick={async () => {
                            try {
                              await publishAppointment(s.id)
                              showSnack('Nashr qilindi', 'success')
                              await load()
                            } catch (e) {
                              showSnack(e instanceof ApiError ? e.message : 'Xato', 'error')
                            }
                          }}
                          sx={{ borderRadius: '10px', textTransform: 'none', fontWeight: 700 }}
                        >
                          Nashr
                        </Button>
                      )}
                      {s.status === 'published' && (
                        <Button
                          size="small"
                          variant="outlined"
                          color="warning"
                          startIcon={<StopCircleRounded />}
                          onClick={async () => {
                            try {
                              await closeAppointment(s.id)
                              showSnack('Yopildi', 'success')
                              await load()
                            } catch (e) {
                              showSnack(e instanceof ApiError ? e.message : 'Xato', 'error')
                            }
                          }}
                          sx={{ borderRadius: '10px', textTransform: 'none', fontWeight: 600 }}
                        >
                          Yopish
                        </Button>
                      )}
                      {s.status !== 'closed' && (
                        <Tooltip title="Tahrirlash">
                          <IconButton
                            size="small"
                            onClick={() => openEdit(s)}
                            sx={{
                              border: '1px solid',
                              borderColor: 'divider',
                              borderRadius: '10px',
                            }}
                          >
                            <EditRounded fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                      <Tooltip title="O‘chirish">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={async () => {
                            if (!confirm(`«${s.title}» o‘chirilsinmi?`)) return
                            try {
                              await deleteAppointment(s.id)
                              showSnack('O‘chirildi', 'success')
                              await load()
                            } catch (e) {
                              showSnack(e instanceof ApiError ? e.message : 'Xato', 'error')
                            }
                          }}
                          sx={{
                            border: '1px solid',
                            borderColor: 'rgba(239,68,68,0.25)',
                            borderRadius: '10px',
                          }}
                        >
                          <DeleteOutlineRounded fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </div>
                  </div>

                  {/* meta grid */}
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    <div className="rounded-xl border border-slate-100 bg-slate-50/90 px-3 py-2.5">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                        Slot
                      </p>
                      <p className="mt-0.5 text-sm font-semibold text-slate-800">
                        har {s.slotIntervalMinutes} daqiqa
                      </p>
                    </div>
                    <div className="rounded-xl border border-slate-100 bg-slate-50/90 px-3 py-2.5">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                        Oldindan
                      </p>
                      <p className="mt-0.5 text-sm font-semibold text-slate-800">
                        {s.maxDaysAhead} kun
                      </p>
                    </div>
                    <div className="col-span-2 rounded-xl border border-slate-100 bg-slate-50/90 px-3 py-2.5 sm:col-span-1">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                        Vizitka
                      </p>
                      <p className="mt-0.5 truncate text-sm font-semibold text-slate-800">
                        {s.cardId
                          ? cardLabels[s.cardId] || 'Biriktirilgan'
                          : 'Biriktirilmagan'}
                      </p>
                    </div>
                  </div>

                  {/* booking link */}
                  {s.bookingUrl && (
                    <div className="flex items-center gap-2 rounded-xl border border-teal-100 bg-gradient-to-r from-teal-50/90 to-cyan-50/50 px-3 py-2.5">
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-teal-700/70">
                          Bron havolasi
                        </p>
                        <p className="truncate text-sm font-medium text-teal-900">
                          {s.bookingUrl}
                        </p>
                      </div>
                      <Tooltip title="Nusxa olish">
                        <IconButton
                          size="small"
                          onClick={() => {
                            void navigator.clipboard.writeText(s.bookingUrl!)
                            showSnack('Havola nusxalandi', 'success')
                          }}
                          sx={{ bgcolor: 'white', borderRadius: '10px' }}
                        >
                          <ContentCopyRounded fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Yangiy oynada">
                        <IconButton
                          size="small"
                          component="a"
                          href={s.bookingUrl}
                          target="_blank"
                          rel="noreferrer"
                          sx={{ bgcolor: 'white', borderRadius: '10px' }}
                        >
                          <OpenInNewRounded fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </div>
                  )}

                  {/* schedule */}
                  {workDays.length > 0 && (
                    <div>
                      <div className="mb-2 flex items-center gap-1.5 text-slate-500">
                        <ScheduleRounded sx={{ fontSize: 16 }} />
                        <span className="text-[11px] font-semibold uppercase tracking-wider">
                          Ish kunlari
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {workDays.map((d) => (
                          <div
                            key={d.weekday}
                            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 shadow-sm shadow-slate-900/5"
                          >
                            <span className="text-xs font-bold text-slate-800">
                              {WEEKDAY_LABELS[d.weekday]}
                            </span>
                            <span className="text-xs tabular-nums text-slate-500">
                              {d.start}–{d.end}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* primary actions */}
                  <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                    <Button
                      variant="contained"
                      startIcon={<EventAvailableRounded />}
                      onClick={() => openBookings(s)}
                      sx={{
                        borderRadius: '12px',
                        textTransform: 'none',
                        fontWeight: 700,
                        px: 2,
                        boxShadow: 'none',
                        bgcolor: '#0d9488',
                        '&:hover': { bgcolor: '#0f766e', boxShadow: 'none' },
                      }}
                    >
                      Bronlar
                    </Button>
                    <Button
                      variant="outlined"
                      startIcon={<ContactMailRounded />}
                      onClick={() => setCardWorkspace(s)}
                      sx={{
                        borderRadius: '12px',
                        textTransform: 'none',
                        fontWeight: 700,
                        borderColor: 'rgba(13,148,136,0.35)',
                        color: '#0f766e',
                        '&:hover': {
                          borderColor: '#0d9488',
                          bgcolor: 'rgba(13,148,136,0.06)',
                        },
                      }}
                    >
                      {s.cardId ? 'Vizitkani tahrirlash' : 'Vizitka yaratish'}
                    </Button>
                    {s.cardId && (
                      <Button
                        size="medium"
                        color="inherit"
                        startIcon={<LinkOffRounded />}
                        onClick={async () => {
                          try {
                            await detachCardFromAppointment(s.id)
                            showSnack('Vizitka ajratildi', 'info')
                            await load()
                          } catch (e) {
                            showSnack(e instanceof ApiError ? e.message : 'Xato', 'error')
                          }
                        }}
                        sx={{
                          borderRadius: '12px',
                          textTransform: 'none',
                          fontWeight: 600,
                          color: 'text.secondary',
                        }}
                      >
                        Ajratish
                      </Button>
                    )}
                  </div>
                </div>
              </motion.article>
            )
          })}
        </div>
      )}

      <Typography className="!text-sm !text-slate-500">
        «Vizitka» tugmasi orqali shablondan yoki o‘zingiz yaratasiz, matnlarni to‘ldirasiz, A4
        joylashuvini sozlab saqlaysiz va PDF yuklab olasiz.
      </Typography>

      <AppointmentCardWorkspace
        open={Boolean(cardWorkspace)}
        appointment={
          cardWorkspace
            ? items.find((x) => x.id === cardWorkspace.id) || cardWorkspace
            : null
        }
        onClose={() => setCardWorkspace(null)}
        onLinked={() => load()}
      />

      {/* Editor */}
      <Dialog open={editorOpen} onClose={() => !saving && setEditorOpen(false)} fullWidth maxWidth="md">
        <DialogTitle sx={headingFont}>
          {editing ? 'Qabulni tahrirlash' : 'Yangi qabul'}
        </DialogTitle>
        <DialogContent className="!pt-2 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField
              label="Nom"
              fullWidth
              value={form.title}
              onChange={(e) => {
                const title = e.target.value
                setForm((f) => ({
                  ...f,
                  title,
                  slug: editing ? f.slug : slugify(title) || f.slug,
                }))
              }}
            />
            <TextField
              label="Slug (havola)"
              fullWidth
              value={form.slug}
              onChange={(e) =>
                setForm((f) => ({ ...f, slug: slugify(e.target.value) || e.target.value }))
              }
              helperText="Masalan: stomatologiya-qabul"
            />
          </div>
          <TextField
            label="Tavsif"
            fullWidth
            multiline
            minRows={2}
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField
              select
              label="Slot oralig‘i (daqiqa)"
              fullWidth
              value={form.slotIntervalMinutes}
              onChange={(e) =>
                setForm((f) => ({ ...f, slotIntervalMinutes: Number(e.target.value) }))
              }
            >
              {INTERVAL_OPTIONS.map((n) => (
                <MenuItem key={n} value={n}>
                  Har {n} daqiqa
                </MenuItem>
              ))}
            </TextField>
            <TextField
              type="number"
              label="Oldindan necha kunga"
              fullWidth
              value={form.maxDaysAhead ?? 30}
              onChange={(e) =>
                setForm((f) => ({ ...f, maxDaysAhead: Number(e.target.value) || 30 }))
              }
              slotProps={{
                htmlInput: { min: 1, max: 365 },
              }}
            />
          </div>

          <Typography className="!font-semibold !pt-1">Ish kunlari va soatlar</Typography>
          <div className="space-y-2">
            {form.schedule.map((day, idx) => (
              <div
                key={day.weekday}
                className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2"
              >
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={day.enabled}
                      onChange={(e) => {
                        const schedule = [...form.schedule]
                        schedule[idx] = { ...day, enabled: e.target.checked }
                        setForm((f) => ({ ...f, schedule }))
                      }}
                    />
                  }
                  label={WEEKDAY_LABELS[day.weekday]}
                  className="!min-w-[140px]"
                />
                <TextField
                  type="time"
                  size="small"
                  label="Boshlanish"
                  value={day.start}
                  disabled={!day.enabled}
                  onChange={(e) => {
                    const schedule = [...form.schedule]
                    schedule[idx] = { ...day, start: e.target.value }
                    setForm((f) => ({ ...f, schedule }))
                  }}
                  slotProps={{ inputLabel: { shrink: true } }}
                />
                <TextField
                  type="time"
                  size="small"
                  label="Tugash"
                  value={day.end}
                  disabled={!day.enabled}
                  onChange={(e) => {
                    const schedule = [...form.schedule]
                    schedule[idx] = { ...day, end: e.target.value }
                    setForm((f) => ({ ...f, schedule }))
                  }}
                  slotProps={{ inputLabel: { shrink: true } }}
                />
              </div>
            ))}
          </div>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditorOpen(false)} disabled={saving}>
            Bekor
          </Button>
          <Button variant="contained" onClick={() => void saveForm()} disabled={saving}>
            {saving ? '…' : 'Saqlash'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Bookings */}
      <Dialog
        open={bookingsOpen}
        onClose={() => setBookingsOpen(false)}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle sx={headingFont}>
          Bronlar{activeService ? ` — ${activeService.title}` : ''}
        </DialogTitle>
        <DialogContent className="!pt-1">
          {summary && (
            <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                ['Bugun', summary.today],
                ['Hafta', summary.thisWeek],
                ['Kutilmoqda', summary.pending],
                ['Jami', summary.total],
              ].map(([label, val]) => (
                <div
                  key={String(label)}
                  className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-center"
                >
                  <div className="text-lg font-bold text-slate-800">{val}</div>
                  <div className="text-xs text-slate-500">{label}</div>
                </div>
              ))}
            </div>
          )}
          <TextField
            select
            size="small"
            label="Holat"
            value={bookingStatus}
            onChange={(e) => {
              setBookingStatus(e.target.value)
              if (activeService) void loadBookings(activeService, e.target.value)
            }}
            className="!mb-3 !min-w-[160px]"
          >
            <MenuItem value="">Barchasi</MenuItem>
            {Object.entries(BOOKING_STATUS_META).map(([k, v]) => (
              <MenuItem key={k} value={k}>
                {v.label}
              </MenuItem>
            ))}
          </TextField>

          {bookingsLoading ? (
            <div className="flex justify-center py-10">
              <CircularProgress size={28} />
            </div>
          ) : bookings.length === 0 ? (
            <Typography className="!text-sm !text-slate-500 !py-8 !text-center">
              Bronlar yo‘q
            </Typography>
          ) : (
            <div className="space-y-2">
              {bookings.map((b) => {
                const st = BOOKING_STATUS_META[b.status]
                return (
                  <div
                    key={b.id}
                    className="rounded-xl border border-slate-150 bg-white px-3 py-3 sm:flex sm:items-center sm:justify-between"
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold">{b.name}</span>
                        <Chip
                          size="small"
                          label={st.label}
                          sx={{ bgcolor: st.bg, color: st.color, fontWeight: 600 }}
                        />
                      </div>
                      <Typography className="!text-sm !text-slate-600">
                        {b.date} · {b.slotStart}–{b.slotEnd} · {b.phone}
                      </Typography>
                      {b.purpose && (
                        <Typography className="!text-xs !text-slate-500 !mt-0.5">
                          Murojaat: {b.purpose}
                        </Typography>
                      )}
                      {b.conclusion && (
                        <Typography className="!text-xs !text-teal-800 !mt-0.5">
                          Xulosa: {b.conclusion}
                        </Typography>
                      )}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1 sm:mt-0">
                      {b.status === 'pending' && (
                        <Button
                          size="small"
                          onClick={async () => {
                            try {
                              await updateBooking(b.id, { status: 'confirmed' })
                              if (activeService) await loadBookings(activeService)
                            } catch (e) {
                              showSnack(
                                e instanceof ApiError ? e.message : 'Xato',
                                'error',
                              )
                            }
                          }}
                        >
                          Tasdiqlash
                        </Button>
                      )}
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => {
                          setConcludeItem(b)
                          setConclusion(b.conclusion || '')
                          setBookingActionStatus(
                            b.status === 'pending' || b.status === 'confirmed'
                              ? 'completed'
                              : b.status,
                          )
                        }}
                      >
                        Xulosa
                      </Button>
                      {b.status !== 'cancelled' && (
                        <Button
                          size="small"
                          color="error"
                          onClick={async () => {
                            try {
                              await updateBooking(b.id, { status: 'cancelled' })
                              if (activeService) await loadBookings(activeService)
                            } catch (e) {
                              showSnack(
                                e instanceof ApiError ? e.message : 'Xato',
                                'error',
                              )
                            }
                          }}
                        >
                          Bekor
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBookingsOpen(false)}>Yopish</Button>
        </DialogActions>
      </Dialog>

      {/* Conclude */}
      <Dialog open={Boolean(concludeItem)} onClose={() => setConcludeItem(null)} fullWidth maxWidth="sm">
        <DialogTitle sx={headingFont}>Xulosa / holat</DialogTitle>
        <DialogContent className="!pt-2 space-y-3">
          {concludeItem && (
            <Typography className="!text-sm !text-slate-600">
              {concludeItem.name} · {concludeItem.date} {concludeItem.slotStart}
            </Typography>
          )}
          <TextField
            select
            fullWidth
            label="Holat"
            value={bookingActionStatus}
            onChange={(e) => setBookingActionStatus(e.target.value as BookingStatus)}
          >
            {Object.entries(BOOKING_STATUS_META).map(([k, v]) => (
              <MenuItem key={k} value={k}>
                {v.label}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            fullWidth
            multiline
            minRows={3}
            label="Xulosa / qayd"
            value={conclusion}
            onChange={(e) => setConclusion(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConcludeItem(null)}>Bekor</Button>
          <Button
            variant="contained"
            onClick={async () => {
              if (!concludeItem) return
              try {
                await updateBooking(concludeItem.id, {
                  status: bookingActionStatus,
                  conclusion: conclusion.trim() || undefined,
                })
                showSnack('Saqlandi', 'success')
                setConcludeItem(null)
                if (activeService) await loadBookings(activeService)
              } catch (e) {
                showSnack(e instanceof ApiError ? e.message : 'Xato', 'error')
              }
            }}
          >
            Saqlash
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
