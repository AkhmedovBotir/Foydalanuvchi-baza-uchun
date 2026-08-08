import { useCallback, useEffect, useState } from 'react'
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
  TextField,
  Typography,
} from '@mui/material'
import {
  LocalHospitalRounded,
  MoneyRounded,
  PersonOffRounded,
  RefreshRounded,
} from '@mui/icons-material'
import { ApiError } from '../api/client'
import type { CaseItem, DoctorBrief } from '../api/types'
import {
  assignBooking,
  assignResponse,
  listBookings,
  listDoctors,
  listResponses,
  noShowBooking,
  noShowResponse,
  payBooking,
  payResponse,
} from '../api/workflow'
import { formatDateTime, formatMoney, STATUS_COLORS, STATUS_LABELS } from '../lib/format'
import { useSnack } from '../ui/SnackProvider'
import { useConfirm } from '../ui/ConfirmProvider'

type Kind = 'response' | 'booking'

const FILTERS = [
  { value: '', label: 'Barchasi' },
  { value: 'pending', label: 'Kutilmoqda' },
  { value: 'assigned', label: 'Yuborilgan' },
  { value: 'paid', label: 'To‘langan' },
  { value: 'no_show', label: 'Kelmagan' },
  { value: 'concluded', label: 'Xulosa' },
  { value: 'cancelled', label: 'Bekor' },
]

type Props = {
  kind: Kind
  title: string
  subtitle: string
}

export function CasesPage({ kind, title, subtitle }: Props) {
  const { showSnack } = useSnack()
  const confirm = useConfirm()
  const [items, setItems] = useState<CaseItem[]>([])
  const [total, setTotal] = useState(0)
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(true)
  const [doctors, setDoctors] = useState<DoctorBrief[]>([])
  const [active, setActive] = useState<CaseItem | null>(null)
  const [mode, setMode] = useState<'assign' | 'pay' | 'detail' | null>(null)
  const [doctorId, setDoctorId] = useState('')
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [list, docs] = await Promise.all([
        kind === 'response'
          ? listResponses({ page: 1, limit: 100, status: status || undefined })
          : listBookings({ page: 1, limit: 100, status: status || undefined }),
        listDoctors(),
      ])
      setItems(list.data)
      setTotal(list.total)
      setDoctors(docs)
    } catch (err) {
      showSnack(err instanceof ApiError ? err.message : 'Ro‘yxat yuklanmadi', 'error')
    } finally {
      setLoading(false)
    }
  }, [kind, showSnack, status])

  useEffect(() => {
    void load()
  }, [load])

  const openAssign = (item: CaseItem) => {
    setActive(item)
    setMode('assign')
    setDoctorId(item.assignedDoctorId || '')
    setAmount(item.paymentAmount != null ? String(item.paymentAmount) : '')
    setNote(item.paymentNote || '')
  }

  const openPay = (item: CaseItem) => {
    setActive(item)
    setMode('pay')
    setAmount(item.paymentAmount != null ? String(item.paymentAmount) : '')
    setNote(item.paymentNote || '')
  }

  const openDetail = (item: CaseItem) => {
    setActive(item)
    setMode('detail')
  }

  const closeDialog = () => {
    if (busy) return
    setActive(null)
    setMode(null)
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
          ? await assignResponse(active.id, payload)
          : await assignBooking(active.id, payload)
      showSnack('Doktorga yo‘naltirildi', 'success')
      setItems((prev) => prev.map((x) => (x.id === updated.id ? updated : x)))
      closeDialog()
    } catch (err) {
      showSnack(err instanceof ApiError ? err.message : 'Xato', 'error')
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
          ? await payResponse(active.id, payload)
          : await payBooking(active.id, payload)
      showSnack('To‘lov qayd qilindi', 'success')
      setItems((prev) => prev.map((x) => (x.id === updated.id ? updated : x)))
      closeDialog()
    } catch (err) {
      showSnack(err instanceof ApiError ? err.message : 'Xato', 'error')
    } finally {
      setBusy(false)
    }
  }

  const onNoShow = async (item: CaseItem) => {
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
        kind === 'response' ? await noShowResponse(item.id) : await noShowBooking(item.id)
      showSnack('Kelmagan deb belgilandi', 'success')
      setItems((prev) => prev.map((x) => (x.id === updated.id ? updated : x)))
    } catch (err) {
      showSnack(err instanceof ApiError ? err.message : 'Xato', 'error')
    } finally {
      setBusy(false)
    }
  }

  const canWork = (s: string) =>
    s === 'pending' || s === 'assigned' || s === 'paid'

  return (
    <Stack spacing={2.5}>
      <Box className="flex flex-wrap items-end justify-between gap-3">
        <Box>
          <Typography
            variant="h4"
            sx={{ fontFamily: "'Outfit', sans-serif", fontWeight: 800, letterSpacing: '-0.03em' }}
          >
            {title}
          </Typography>
          <Typography color="text.secondary" className="!mt-1">
            {subtitle} · jami {total}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>Holat</InputLabel>
            <Select
              label="Holat"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              {FILTERS.map((f) => (
                <MenuItem key={f.value || 'all'} value={f.value}>
                  {f.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button startIcon={<RefreshRounded />} onClick={() => void load()} disabled={loading}>
            Yangilash
          </Button>
        </Stack>
      </Box>

      {loading ? (
        <Box className="grid min-h-[30vh] place-items-center">
          <CircularProgress />
        </Box>
      ) : items.length === 0 ? (
        <Box className="rounded-2xl bg-white p-8 text-center ring-1 ring-slate-200/80">
          <Typography color="text.secondary">Hozircha yozuv yo‘q</Typography>
        </Box>
      ) : (
        <Stack spacing={1.5}>
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
                    <Typography variant="body2" sx={{ mt: 0.5, color: 'primary.main', fontWeight: 600 }}>
                      Referal: {item.referralName}
                      {item.referralSpecialty ? ` · ${item.referralSpecialty}` : ''}
                      {item.referralPhone ? ` · ${item.referralPhone}` : ''}
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
                  <Typography variant="caption" color="text.secondary" className="!mt-1" sx={{ display: 'block' }}>
                    {formatDateTime(item.createdAt)}
                    {item.doctorName ? ` · Dr. ${item.doctorName}` : ''}
                    {item.paymentAmount != null
                      ? ` · ${formatMoney(item.paymentAmount)}`
                      : ''}
                  </Typography>
                </Box>
                <Chip
                  size="small"
                  label={STATUS_LABELS[item.workflowStatus] || item.workflowStatus}
                  color={STATUS_COLORS[item.workflowStatus] || 'default'}
                  variant="outlined"
                />
              </Box>

              <Stack direction="row" spacing={1} className="!mt-3" sx={{ flexWrap: 'wrap' }} useFlexGap>
                <Button size="small" onClick={() => openDetail(item)}>
                  Batafsil
                </Button>
                {canWork(item.workflowStatus) && (
                  <>
                    <Button
                      size="small"
                      variant="contained"
                      startIcon={<LocalHospitalRounded />}
                      onClick={() => openAssign(item)}
                    >
                      Doktorga
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<MoneyRounded />}
                      onClick={() => openPay(item)}
                    >
                      To‘lov
                    </Button>
                    <Button
                      size="small"
                      color="error"
                      startIcon={<PersonOffRounded />}
                      disabled={busy}
                      onClick={() => void onNoShow(item)}
                    >
                      Kelmagan
                    </Button>
                  </>
                )}
              </Stack>
            </Box>
          ))}
        </Stack>
      )}

      <Dialog open={mode === 'assign'} onClose={closeDialog} fullWidth maxWidth="xs">
        <DialogTitle>Doktorga yo‘naltirish</DialogTitle>
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
          <Button onClick={closeDialog} disabled={busy}>
            Bekor
          </Button>
          <Button variant="contained" onClick={() => void onAssign()} disabled={busy}>
            {busy ? '…' : 'Yo‘naltirish'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={mode === 'pay'} onClose={closeDialog} fullWidth maxWidth="xs">
        <DialogTitle>To‘lovni qayd qilish</DialogTitle>
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
          <Button onClick={closeDialog} disabled={busy}>
            Bekor
          </Button>
          <Button variant="contained" onClick={() => void onPay()} disabled={busy}>
            {busy ? '…' : 'Saqlash'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={mode === 'detail'} onClose={closeDialog} fullWidth maxWidth="sm">
        <DialogTitle>Batafsil</DialogTitle>
        <DialogContent>
          {active && (
            <Stack spacing={1.2} className="!pt-1">
              <Row label="Bemor" value={active.patientName} />
              <Row label="Telefon" value={active.patientPhone} />
              <Row label="Manba" value={active.title || active.source} />
              <Row
                label="Holat"
                value={STATUS_LABELS[active.workflowStatus] || active.workflowStatus}
              />
              <Row label="Shifokor" value={active.doctorName || '—'} />
              <Row label="To‘lov" value={formatMoney(active.paymentAmount)} />
              {active.referralName && (
                <Row
                  label="Referal"
                  value={`${active.referralName}${active.referralSpecialty ? ` (${active.referralSpecialty})` : ''}${active.referralPhone ? ` · ${active.referralPhone}` : ''}`}
                />
              )}
              <Row label="To‘lov izohi" value={active.paymentNote || '—'} />
              {active.date && (
                <Row
                  label="Vaqt"
                  value={`${active.date} ${active.slotStart || ''}${active.slotEnd ? `–${active.slotEnd}` : ''}`}
                />
              )}
              {active.purpose && <Row label="Maqsad" value={active.purpose} />}
              {active.conclusion && <Row label="Xulosa" value={active.conclusion} />}
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
          <Button onClick={closeDialog}>Yopish</Button>
        </DialogActions>
      </Dialog>
    </Stack>
  )
}

function Row({ label, value }: { label: string; value: string }) {
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

export function ResponsesPage() {
  return (
    <CasesPage
      kind="response"
      title="So‘rovnoma javoblari"
      subtitle="Kompaniya so‘rovnomalariga javob berganlar"
    />
  )
}

export function BookingsPage() {
  return (
    <CasesPage
      kind="booking"
      title="Qabul bronlari"
      subtitle="Qabul tizimida yozilganlar"
    />
  )
}
