import { useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material'
import {
  CancelOutlined,
  LocalHospitalRounded,
  MoneyRounded,
  NoteAddRounded,
  PersonOffRounded,
  RefreshRounded,
} from '@mui/icons-material'
import { ApiError } from '../api/client'
import { listDoctors, type Doctor } from '../api/staff'
import {
  WORKFLOW_STATUS_COLORS,
  WORKFLOW_STATUS_LABELS,
  assignWorkflowBooking,
  assignWorkflowResponse,
  cancelWorkflowBooking,
  cancelWorkflowResponse,
  concludeWorkflowBooking,
  concludeWorkflowResponse,
  doctorNoShowWorkflowBooking,
  doctorNoShowWorkflowResponse,
  getWorkflowDashboard,
  listWorkflowBookings,
  listWorkflowResponses,
  noShowWorkflowBooking,
  noShowWorkflowResponse,
  payWorkflowBooking,
  payWorkflowResponse,
  type WorkflowCase,
  type WorkflowDashboard,
} from '../api/workflow'
import { useConfirm } from '../ui/ConfirmProvider'
import { useSnack } from '../ui/SnackProvider'

const headingFont = { fontFamily: "'Outfit', sans-serif" }

const FILTERS = [
  { value: '', label: 'Barchasi' },
  { value: 'pending', label: 'Kutilmoqda' },
  { value: 'assigned', label: 'Yuborilgan' },
  { value: 'paid', label: 'To‘langan' },
  { value: 'no_show', label: 'Kelmagan' },
  { value: 'concluded', label: 'Xulosa' },
  { value: 'cancelled', label: 'Bekor' },
  { value: 'doctor_no_show', label: 'Kirmagan' },
]

function money(n?: number | null) {
  if (n == null) return '—'
  return new Intl.NumberFormat('uz-UZ').format(n) + ' so‘m'
}

function formatDateTime(iso?: string) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString('uz-UZ', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

type Kind = 'response' | 'booking'
type Mode = 'assign' | 'pay' | 'conclude' | 'detail' | null

export function WorkflowPage() {
  const { showSnack } = useSnack()
  const confirm = useConfirm()
  const [tab, setTab] = useState(0)
  const [summary, setSummary] = useState<WorkflowDashboard | null>(null)
  const [items, setItems] = useState<WorkflowCase[]>([])
  const [total, setTotal] = useState(0)
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [status, setStatus] = useState('')
  const [doctorFilter, setDoctorFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [active, setActive] = useState<WorkflowCase | null>(null)
  const [mode, setMode] = useState<Mode>(null)
  const [doctorId, setDoctorId] = useState('')
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [conclusion, setConclusion] = useState('')
  const [busy, setBusy] = useState(false)

  const kind: Kind = tab === 0 ? 'response' : 'booking'

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [dash, list, docs] = await Promise.all([
        getWorkflowDashboard(),
        kind === 'response'
          ? listWorkflowResponses({
              page: 1,
              limit: 100,
              status: status || undefined,
              doctorId: doctorFilter || undefined,
            })
          : listWorkflowBookings({
              page: 1,
              limit: 100,
              status: status || undefined,
              doctorId: doctorFilter || undefined,
            }),
        listDoctors().catch(() => [] as Doctor[]),
      ])
      setSummary(dash)
      setItems(list?.data ?? [])
      setTotal(list?.total ?? 0)
      setDoctors(docs ?? [])
    } catch (e) {
      showSnack(e instanceof ApiError ? e.message : 'Yuklashda xato', 'error')
    } finally {
      setLoading(false)
    }
  }, [doctorFilter, kind, showSnack, status])

  useEffect(() => {
    void load()
  }, [load])

  const closeDialog = () => {
    if (busy) return
    setActive(null)
    setMode(null)
  }

  const openAssign = (item: WorkflowCase) => {
    setActive(item)
    setMode('assign')
    setDoctorId(item.assignedDoctorId || '')
    setAmount(item.paymentAmount != null ? String(item.paymentAmount) : '')
    setNote(item.paymentNote || '')
  }

  const openPay = (item: WorkflowCase) => {
    setActive(item)
    setMode('pay')
    setAmount(item.paymentAmount != null ? String(item.paymentAmount) : '')
    setNote(item.paymentNote || '')
  }

  const openConclude = (item: WorkflowCase) => {
    setActive(item)
    setMode('conclude')
    setConclusion(item.conclusion || '')
  }

  const openDetail = (item: WorkflowCase) => {
    setActive(item)
    setMode('detail')
  }

  const patchItem = (updated: WorkflowCase) => {
    setItems((prev) => prev.map((x) => (x.id === updated.id ? updated : x)))
  }

  const onAssign = async () => {
    if (!active || !doctorId) {
      showSnack('Shifokorni tanlang', 'warning')
      return
    }
    setBusy(true)
    try {
      const payload = {
        doctorId,
        paymentAmount: amount ? Number(amount) : undefined,
        paymentNote: note.trim() || undefined,
      }
      const updated =
        kind === 'response'
          ? await assignWorkflowResponse(active.id, payload)
          : await assignWorkflowBooking(active.id, payload)
      showSnack('Doktorga yo‘naltirildi', 'success')
      patchItem(updated)
      closeDialog()
      void load()
    } catch (e) {
      showSnack(e instanceof ApiError ? e.message : 'Xato', 'error')
    } finally {
      setBusy(false)
    }
  }

  const onPay = async () => {
    if (!active) return
    const n = Number(amount)
    if (!n || n <= 0) {
      showSnack('To‘lov summasini kiriting', 'warning')
      return
    }
    setBusy(true)
    try {
      const payload = { amount: n, note: note.trim() || undefined }
      const updated =
        kind === 'response'
          ? await payWorkflowResponse(active.id, payload)
          : await payWorkflowBooking(active.id, payload)
      showSnack('To‘lov qayd qilindi', 'success')
      patchItem(updated)
      closeDialog()
      void load()
    } catch (e) {
      showSnack(e instanceof ApiError ? e.message : 'Xato', 'error')
    } finally {
      setBusy(false)
    }
  }

  const onConclude = async () => {
    if (!active || !conclusion.trim()) {
      showSnack('Xulosa majburiy', 'warning')
      return
    }
    setBusy(true)
    try {
      const body = { conclusion: conclusion.trim() }
      const updated =
        kind === 'response'
          ? await concludeWorkflowResponse(active.id, body)
          : await concludeWorkflowBooking(active.id, body)
      showSnack('Xulosa saqlandi', 'success')
      patchItem(updated)
      closeDialog()
      void load()
    } catch (e) {
      showSnack(e instanceof ApiError ? e.message : 'Xato', 'error')
    } finally {
      setBusy(false)
    }
  }

  const onRegNoShow = async (item: WorkflowCase) => {
    const ok = await confirm({
      title: 'Kelmagan deb belgilash',
      message: `${item.patientName} kelmagan deb belgilansinmi?`,
      confirmLabel: 'Belgilash',
      danger: true,
    })
    if (!ok) return
    setBusy(true)
    try {
      const updated =
        kind === 'response'
          ? await noShowWorkflowResponse(item.id)
          : await noShowWorkflowBooking(item.id)
      showSnack('Kelmagan deb belgilandi', 'success')
      patchItem(updated)
      void load()
    } catch (e) {
      showSnack(e instanceof ApiError ? e.message : 'Xato', 'error')
    } finally {
      setBusy(false)
    }
  }

  const onDocNoShow = async (item: WorkflowCase) => {
    const ok = await confirm({
      title: 'Kirmagan deb belgilash',
      message: `${item.patientName} kirmagan deb belgilansinmi?`,
      confirmLabel: 'Belgilash',
      danger: true,
    })
    if (!ok) return
    setBusy(true)
    try {
      const updated =
        kind === 'response'
          ? await doctorNoShowWorkflowResponse(item.id)
          : await doctorNoShowWorkflowBooking(item.id)
      showSnack('Kirmagan deb belgilandi', 'success')
      patchItem(updated)
      void load()
    } catch (e) {
      showSnack(e instanceof ApiError ? e.message : 'Xato', 'error')
    } finally {
      setBusy(false)
    }
  }

  const onCancel = async (item: WorkflowCase) => {
    const ok = await confirm({
      title: 'Bekor qilish',
      message: `${item.patientName} uchun qabul bekor qilinsinmi?`,
      confirmLabel: 'Bekor qilish',
      danger: true,
    })
    if (!ok) return
    setBusy(true)
    try {
      const updated =
        kind === 'response'
          ? await cancelWorkflowResponse(item.id)
          : await cancelWorkflowBooking(item.id)
      showSnack('Bekor qilindi', 'success')
      patchItem(updated)
      void load()
    } catch (e) {
      showSnack(e instanceof ApiError ? e.message : 'Xato', 'error')
    } finally {
      setBusy(false)
    }
  }

  const canRegAct = (s: string) => s === 'pending' || s === 'assigned' || s === 'paid'
  const canDocAct = (s: string) => s === 'assigned' || s === 'paid'
  const canCancel = (s: string) =>
    s === 'pending' || s === 'assigned' || s === 'paid'

  return (
    <Stack spacing={2.5}>
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-[1.5rem] px-5 py-6 text-white sm:px-7"
        style={{
          background:
            'radial-gradient(1000px 360px at 0% 0%, rgba(45,212,191,0.3), transparent), linear-gradient(135deg, #0f172a 0%, #0f766e 70%)',
        }}
      >
        <Typography
          variant="h4"
          sx={{ ...headingFont, fontWeight: 800, fontSize: { xs: '1.35rem', sm: '1.7rem' } }}
        >
          Navbat boshqaruvi
        </Typography>
        <Typography className="!mt-2 !max-w-2xl !text-[0.9rem] !text-teal-50/90">
          Registrator va shifokor ishlarini shu yerdan boshqaring: yo‘naltirish, to‘lov, xulosa,
          bekor va kelmagan holatlari.
        </Typography>
      </motion.section>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {[
          { label: 'Kutilmoqda', value: summary?.pending },
          { label: 'Yuborilgan', value: summary?.assigned },
          { label: 'To‘langan', value: summary?.paid },
          { label: 'Kelmagan', value: summary?.noShow },
          { label: 'Bugun to‘langan', value: summary?.todayPaid },
        ].map((c) => (
          <Box key={c.label} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80">
            <Typography variant="h5" sx={{ ...headingFont, fontWeight: 800 }}>
              {c.value ?? '—'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {c.label}
            </Typography>
          </Box>
        ))}
      </div>

      <Box className="rounded-[1.25rem] bg-white shadow-sm ring-1 ring-slate-200/80">
        <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable">
          <Tab label="So‘rovnomalar" sx={{ textTransform: 'none', fontWeight: 700 }} />
          <Tab label="Qabul bronlari" sx={{ textTransform: 'none', fontWeight: 700 }} />
        </Tabs>
      </Box>

      <Box className="flex flex-wrap items-end gap-2 rounded-2xl bg-white p-3 ring-1 ring-slate-200/80">
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Holat</InputLabel>
          <Select label="Holat" value={status} onChange={(e) => setStatus(e.target.value)}>
            {FILTERS.map((f) => (
              <MenuItem key={f.value || 'all'} value={f.value}>
                {f.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 170 }}>
          <InputLabel>Shifokor</InputLabel>
          <Select
            label="Shifokor"
            value={doctorFilter}
            onChange={(e) => setDoctorFilter(e.target.value)}
          >
            <MenuItem value="">Barchasi</MenuItem>
            {doctors.map((d) => (
              <MenuItem key={d.id} value={d.id}>
                {d.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <Typography variant="body2" color="text.secondary" className="!ml-1 !mb-1">
          Jami: {total}
        </Typography>
        <Button
          startIcon={<RefreshRounded />}
          onClick={() => void load()}
          disabled={loading}
          sx={{ textTransform: 'none', ml: 'auto' }}
        >
          Yangilash
        </Button>
      </Box>

      {loading ? (
        <Box className="grid min-h-[30vh] place-items-center">
          <CircularProgress />
        </Box>
      ) : items.length === 0 ? (
        <Box className="rounded-2xl border border-dashed border-slate-200 bg-white py-14 text-center text-slate-500">
          Hozircha yozuv yo‘q
        </Box>
      ) : (
        <Stack spacing={1.4}>
          {items.map((item) => (
            <Box
              key={item.id}
              className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/70"
            >
              <Box className="flex flex-wrap items-start justify-between gap-2">
                <Box className="min-w-0 flex-1">
                  <Typography sx={{ fontWeight: 700 }}>{item.patientName}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {item.patientPhone}
                    {item.title ? ` · ${item.title}` : ''}
                  </Typography>
                  {item.referralName && (
                    <Typography
                      variant="body2"
                      sx={{ mt: 0.5, color: 'primary.main', fontWeight: 600 }}
                    >
                      Referal: {item.referralName}
                      {item.referralSpecialty ? ` · ${item.referralSpecialty}` : ''}
                    </Typography>
                  )}
                  {kind === 'booking' && item.date && (
                    <Typography variant="body2" color="text.secondary" className="!mt-0.5">
                      {item.date}
                      {item.slotStart ? ` ${item.slotStart}` : ''}
                      {item.slotEnd ? `–${item.slotEnd}` : ''}
                      {item.purpose ? ` · ${item.purpose}` : ''}
                    </Typography>
                  )}
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    className="!mt-1"
                    sx={{ display: 'block' }}
                  >
                    {formatDateTime(item.createdAt)}
                    {item.doctorName ? ` · Dr. ${item.doctorName}` : ''}
                    {item.paymentAmount != null ? ` · ${money(item.paymentAmount)}` : ''}
                  </Typography>
                  {item.conclusion && (
                    <Typography variant="body2" className="!mt-1">
                      Xulosa: {item.conclusion}
                    </Typography>
                  )}
                </Box>
                <Chip
                  size="small"
                  label={WORKFLOW_STATUS_LABELS[item.workflowStatus] || item.workflowStatus}
                  color={WORKFLOW_STATUS_COLORS[item.workflowStatus] || 'default'}
                  variant="outlined"
                />
              </Box>

              <Stack
                direction="row"
                spacing={1}
                className="!mt-3"
                sx={{ flexWrap: 'wrap' }}
                useFlexGap
              >
                <Button size="small" onClick={() => openDetail(item)} sx={{ textTransform: 'none' }}>
                  Batafsil
                </Button>
                {canRegAct(item.workflowStatus) && (
                  <>
                    <Button
                      size="small"
                      variant="contained"
                      startIcon={<LocalHospitalRounded />}
                      onClick={() => openAssign(item)}
                      sx={{ textTransform: 'none' }}
                    >
                      Doktorga
                    </Button>
                    {item.workflowStatus !== 'pending' && (
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<MoneyRounded />}
                        onClick={() => openPay(item)}
                        sx={{ textTransform: 'none' }}
                      >
                        To‘lov
                      </Button>
                    )}
                    <Button
                      size="small"
                      color="error"
                      startIcon={<PersonOffRounded />}
                      disabled={busy}
                      onClick={() => void onRegNoShow(item)}
                      sx={{ textTransform: 'none' }}
                    >
                      Kelmagan
                    </Button>
                  </>
                )}
                {canDocAct(item.workflowStatus) && (
                  <>
                    <Button
                      size="small"
                      variant="contained"
                      color="success"
                      startIcon={<NoteAddRounded />}
                      onClick={() => openConclude(item)}
                      sx={{ textTransform: 'none' }}
                    >
                      Xulosa
                    </Button>
                    <Button
                      size="small"
                      color="warning"
                      startIcon={<PersonOffRounded />}
                      disabled={busy}
                      onClick={() => void onDocNoShow(item)}
                      sx={{ textTransform: 'none' }}
                    >
                      Kirmagan
                    </Button>
                  </>
                )}
                {canCancel(item.workflowStatus) && (
                  <Button
                    size="small"
                    color="inherit"
                    startIcon={<CancelOutlined />}
                    disabled={busy}
                    onClick={() => void onCancel(item)}
                    sx={{ textTransform: 'none' }}
                  >
                    Bekor
                  </Button>
                )}
              </Stack>
            </Box>
          ))}
        </Stack>
      )}

      <Dialog open={mode === 'assign'} onClose={closeDialog} fullWidth maxWidth="xs">
        <DialogTitle sx={{ ...headingFont, fontWeight: 700 }}>Doktorga yo‘naltirish</DialogTitle>
        <DialogContent>
          <Stack spacing={2} className="!pt-1">
            <Typography variant="body2" color="text.secondary">
              {active?.patientName} · {active?.patientPhone}
            </Typography>
            <FormControl fullWidth required>
              <InputLabel>Shifokor</InputLabel>
              <Select
                label="Shifokor"
                value={doctorId}
                onChange={(e) => setDoctorId(e.target.value)}
              >
                {doctors.map((d) => (
                  <MenuItem key={d.id} value={d.id}>
                    {d.name} ({d.specialty})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="To‘lov summasi (ixtiyoriy)"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              fullWidth
              helperText="Kiritsangiz holat «To‘lov qilingan» bo‘ladi"
            />
            <TextField
              label="Izoh"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              fullWidth
              multiline
              minRows={2}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog} disabled={busy} sx={{ textTransform: 'none' }}>
            Bekor
          </Button>
          <Button variant="contained" onClick={() => void onAssign()} disabled={busy} sx={{ textTransform: 'none' }}>
            {busy ? '…' : 'Yo‘naltirish'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={mode === 'pay'} onClose={closeDialog} fullWidth maxWidth="xs">
        <DialogTitle sx={{ ...headingFont, fontWeight: 700 }}>To‘lovni qayd qilish</DialogTitle>
        <DialogContent>
          <Stack spacing={2} className="!pt-1">
            <TextField
              label="Summa"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              fullWidth
              autoFocus
            />
            <TextField
              label="Izoh"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              fullWidth
              multiline
              minRows={2}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog} disabled={busy} sx={{ textTransform: 'none' }}>
            Bekor
          </Button>
          <Button variant="contained" onClick={() => void onPay()} disabled={busy} sx={{ textTransform: 'none' }}>
            {busy ? '…' : 'Saqlash'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={mode === 'conclude'} onClose={closeDialog} fullWidth maxWidth="sm">
        <DialogTitle sx={{ ...headingFont, fontWeight: 700 }}>Xulosa yozish</DialogTitle>
        <DialogContent>
          <Stack spacing={2} className="!pt-1">
            <Typography variant="body2" color="text.secondary">
              {active?.patientName} · {active?.patientPhone}
            </Typography>
            <TextField
              label="Xulosa"
              value={conclusion}
              onChange={(e) => setConclusion(e.target.value)}
              fullWidth
              multiline
              minRows={4}
              required
              autoFocus
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog} disabled={busy} sx={{ textTransform: 'none' }}>
            Bekor
          </Button>
          <Button variant="contained" onClick={() => void onConclude()} disabled={busy} sx={{ textTransform: 'none' }}>
            {busy ? '…' : 'Saqlash'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={mode === 'detail'} onClose={closeDialog} fullWidth maxWidth="sm">
        <DialogTitle sx={{ ...headingFont, fontWeight: 700 }}>Batafsil</DialogTitle>
        <DialogContent>
          {active && (
            <Stack spacing={1.2} className="!pt-1">
              <DetailRow label="Bemor" value={active.patientName} />
              <DetailRow label="Telefon" value={active.patientPhone} />
              <DetailRow label="Manba" value={active.title || active.source} />
              <DetailRow
                label="Holat"
                value={WORKFLOW_STATUS_LABELS[active.workflowStatus] || active.workflowStatus}
              />
              <DetailRow label="Shifokor" value={active.doctorName || '—'} />
              <DetailRow label="To‘lov" value={money(active.paymentAmount)} />
              {active.referralName && (
                <DetailRow
                  label="Referal"
                  value={`${active.referralName}${active.referralSpecialty ? ` (${active.referralSpecialty})` : ''}`}
                />
              )}
              <DetailRow label="To‘lov izohi" value={active.paymentNote || '—'} />
              {active.date && (
                <DetailRow
                  label="Vaqt"
                  value={`${active.date} ${active.slotStart || ''}${active.slotEnd ? `–${active.slotEnd}` : ''}`}
                />
              )}
              {active.purpose && <DetailRow label="Maqsad" value={active.purpose} />}
              {active.conclusion && <DetailRow label="Xulosa" value={active.conclusion} />}
              {active.answers && Object.keys(active.answers).length > 0 && (
                <Box className="mt-2 rounded-xl bg-slate-50 p-3">
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }} className="!mb-1">
                    Javoblar
                  </Typography>
                  <Stack spacing={0.75}>
                    {Object.entries(active.answers).map(([k, v]) => (
                      <Typography key={k} variant="body2">
                        <strong>{k}:</strong> {String(v)}
                      </Typography>
                    ))}
                  </Stack>
                </Box>
              )}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog} sx={{ textTransform: 'none' }}>
            Yopish
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <Box className="flex justify-between gap-3 border-b border-slate-100 py-1.5">
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 600, textAlign: 'right' }}>
        {value}
      </Typography>
    </Box>
  )
}
