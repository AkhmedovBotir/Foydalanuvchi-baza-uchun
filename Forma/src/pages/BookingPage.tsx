import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Alert,
  Button,
  CircularProgress,
  CssBaseline,
  Snackbar,
  TextField,
  ThemeProvider,
  Typography,
  createTheme,
} from '@mui/material'
import {
  AccessTimeRounded,
  ArrowBackRounded,
  CalendarMonthRounded,
  CheckCircleOutlineRounded,
  EventAvailableRounded,
  PersonRounded,
} from '@mui/icons-material'
import {
  createBooking,
  getAvailableDays,
  getAvailableSlots,
  getBookingService,
} from '../api/bookings'
import type {
  BookingResult,
  DayAvailability,
  PublicAppointment,
  SlotItem,
} from '../types/booking'
import { PhoneField } from '../ui/PhoneField'
import { isValidUzPhone } from '../lib/phone'

const theme = createTheme({
  palette: {
    primary: { main: '#0d9488' },
    secondary: { main: '#0284c7' },
  },
  typography: { fontFamily: "'Plus Jakarta Sans', sans-serif" },
  shape: { borderRadius: 14 },
  components: {
    MuiButton: {
      styleOverrides: {
        root: { textTransform: 'none', fontWeight: 600 },
      },
    },
  },
})

const WEEKDAYS_SHORT = ['Yak', 'Dush', 'Sesh', 'Chor', 'Pay', 'Jum', 'Shan']
const WEEKDAYS_LONG = [
  'Yakshanba',
  'Dushanba',
  'Seshanba',
  'Chorshanba',
  'Payshanba',
  'Juma',
  'Shanba',
]
const MONTHS = [
  'yanvar',
  'fevral',
  'mart',
  'aprel',
  'may',
  'iyun',
  'iyul',
  'avgust',
  'sentabr',
  'oktabr',
  'noyabr',
  'dekabr',
]

/** YYYY-MM-DD → "10 avgust, dushanba" (brauzer locale ga bog‘lanmaydi) */
function formatDateHuman(iso: string) {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso || '—'
  const [ys, ms, ds] = iso.split('-').map(Number)
  const d = new Date(ys, ms - 1, ds)
  if (Number.isNaN(d.getTime())) return iso
  const day = d.getDate()
  const month = MONTHS[d.getMonth()]
  const weekday = WEEKDAYS_LONG[d.getDay()]
  return `${day} ${month}, ${weekday}`
}

function addDays(iso: string, n: number) {
  const d = new Date(iso + 'T12:00:00')
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}

function todayISO() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

type Step = 'day' | 'slot' | 'form' | 'done'

export function BookingPage() {
  const { slug = '' } = useParams<{ slug: string }>()
  const [searchParams] = useSearchParams()
  const referralId = searchParams.get('ref')?.trim() || ''
  const [service, setService] = useState<PublicAppointment | null>(null)
  const [days, setDays] = useState<DayAvailability[]>([])
  const [slots, setSlots] = useState<SlotItem[]>([])
  const [loading, setLoading] = useState(true)
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [snack, setSnack] = useState('')

  const [step, setStep] = useState<Step>('day')
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedSlot, setSelectedSlot] = useState<SlotItem | null>(null)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [purpose, setPurpose] = useState('')
  const [result, setResult] = useState<BookingResult | null>(null)

  const maxDays = service?.maxDaysAhead ?? 30

  const loadService = useCallback(async () => {
    if (!slug) return
    setLoading(true)
    setError(null)
    try {
      const svc = await getBookingService(slug)
      if (svc.status === 'closed') {
        setError('Bu qabul yopilgan')
        setService(svc)
        return
      }
      setService(svc)
      const from = todayISO()
      const to = addDays(from, Math.min(svc.maxDaysAhead || 30, 60))
      const dayList = await getAvailableDays(slug, from, to)
      setDays(dayList)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Yuklashda xato')
    } finally {
      setLoading(false)
    }
  }, [slug])

  useEffect(() => {
    void loadService()
  }, [loadService])

  const pickDate = async (date: string) => {
    setSelectedDate(date)
    setSelectedSlot(null)
    setSlotsLoading(true)
    setStep('slot')
    try {
      setSlots(await getAvailableSlots(slug, date))
    } catch (e) {
      setSnack(e instanceof Error ? e.message : 'Slotlar yuklanmadi')
      setSlots([])
    } finally {
      setSlotsLoading(false)
    }
  }

  const openDays = days.filter((d) => d.open && d.freeSlots > 0)

  const formValid = useMemo(() => {
    return name.trim().length >= 2 && isValidUzPhone(phone)
  }, [name, phone])

  const submit = async () => {
    if (!selectedSlot || !formValid) return
    setSubmitting(true)
    try {
      const res = await createBooking(slug, {
        date: selectedDate,
        slotStart: selectedSlot.start,
        name: name.trim(),
        phone: phone.trim(),
        purpose: purpose.trim(),
        referralId: referralId || undefined,
      })
      setResult(res)
      setStep('done')
    } catch (e) {
      setSnack(e instanceof Error ? e.message : 'Bron qilinmadi')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <div className="min-h-svh bg-gradient-to-b from-teal-50 via-white to-sky-50">
        <div className="mx-auto max-w-lg px-4 py-8 sm:py-12">
          {loading ? (
            <div className="flex flex-col items-center gap-3 py-24">
              <CircularProgress />
              <Typography className="!text-slate-500">Yuklanmoqda…</Typography>
            </div>
          ) : error && !service ? (
            <Alert severity="error">{error}</Alert>
          ) : !service ? (
            <Alert severity="warning">Qabul topilmadi</Alert>
          ) : (
            <>
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 text-center"
              >
                <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-teal-500/15 text-teal-700">
                  <EventAvailableRounded fontSize="large" />
                </div>
                <Typography
                  className="!font-bold !text-2xl !tracking-tight"
                  sx={{ fontFamily: "'Outfit', sans-serif" }}
                >
                  {service.title}
                </Typography>
                {service.description && (
                  <Typography className="!mt-2 !text-sm !text-slate-600">
                    {service.description}
                  </Typography>
                )}
                {referralId && (
                  <Alert severity="info" className="!mt-3 !text-left">
                    Siz referal havola orqali yozilmoqdasiz
                  </Alert>
                )}
                {error && (
                  <Alert severity="warning" className="!mt-3 !text-left">
                    {error}
                  </Alert>
                )}
              </motion.div>

              {step === 'done' && result ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="rounded-3xl border border-teal-100 bg-white p-6 text-center shadow-lg shadow-teal-900/5"
                >
                  <CheckCircleOutlineRounded className="!mb-2 !text-5xl !text-teal-600" />
                  <Typography className="!font-bold !text-xl">Bron qabul qilindi</Typography>
                  <Typography className="!mt-3 !text-slate-700 !leading-relaxed">
                    {formatDateHuman(result.date)}
                  </Typography>
                  <Typography className="!mt-1 !font-semibold !text-slate-800">
                    {result.slotStart} – {result.slotEnd}
                  </Typography>
                  <Typography className="!mt-3 !text-sm !text-slate-500">
                    {result.name} · {result.phone}
                  </Typography>
                  <Typography className="!mt-4 !text-xs !text-slate-400">
                    Kompaniya siz bilan bog‘lanishi mumkin. Rahmat!
                  </Typography>
                </motion.div>
              ) : service.status === 'closed' ? null : (
                <div className="rounded-3xl border border-slate-200/80 bg-white p-4 shadow-xl shadow-slate-900/5 sm:p-6">
                  {/* steps indicator */}
                  <div className="mb-5 flex items-center justify-center gap-2 text-xs font-semibold text-slate-400">
                    {[
                      ['day', 'Kun'],
                      ['slot', 'Vaqt'],
                      ['form', 'Ma’lumot'],
                    ].map(([k, label], i) => {
                      const order = ['day', 'slot', 'form']
                      const active = step === k
                      const done = order.indexOf(step) > i
                      return (
                        <span
                          key={k}
                          className={[
                            'rounded-full px-3 py-1',
                            active || done
                              ? 'bg-teal-500/15 text-teal-800'
                              : 'bg-slate-100',
                          ].join(' ')}
                        >
                          {label}
                        </span>
                      )
                    })}
                  </div>

                  {step === 'day' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                      <div className="mb-3 flex items-center gap-2 text-slate-700">
                        <CalendarMonthRounded fontSize="small" />
                        <Typography className="!font-semibold">Kunni tanlang</Typography>
                      </div>
                      {openDays.length === 0 ? (
                        <Alert severity="info">
                          Keyingi {maxDays} kun ichida bo‘sh joy yo‘q
                        </Alert>
                      ) : (
                        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                          {days.map((d) => {
                            const disabled = !d.open || d.freeSlots <= 0
                            const dd = new Date(d.date + 'T12:00:00')
                            return (
                              <button
                                key={d.date}
                                type="button"
                                disabled={disabled}
                                onClick={() => void pickDate(d.date)}
                                className={[
                                  'rounded-2xl border px-2 py-3 text-center transition',
                                  disabled
                                    ? 'cursor-not-allowed border-slate-100 bg-slate-50 text-slate-300'
                                    : 'border-slate-200 bg-white hover:border-teal-400 hover:bg-teal-50',
                                ].join(' ')}
                              >
                                <div className="text-[11px] font-medium uppercase tracking-wide">
                                  {WEEKDAYS_SHORT[dd.getDay()]}
                                </div>
                                <div className="text-lg font-bold">{dd.getDate()}</div>
                                <div className="text-[10px] text-slate-500">
                                  {disabled ? '—' : `${d.freeSlots} joy`}
                                </div>
                              </button>
                            )
                          })}
                        </div>
                      )}
                    </motion.div>
                  )}

                  {step === 'slot' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                      <Button
                        size="small"
                        startIcon={<ArrowBackRounded />}
                        onClick={() => setStep('day')}
                        className="!mb-2"
                      >
                        Kunlar
                      </Button>
                      <div className="mb-3 flex items-center gap-2 text-slate-700">
                        <AccessTimeRounded fontSize="small" />
                        <Typography className="!font-semibold">
                          {formatDateHuman(selectedDate)}
                        </Typography>
                      </div>
                      {slotsLoading ? (
                        <div className="flex justify-center py-10">
                          <CircularProgress size={28} />
                        </div>
                      ) : (
                        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                          {slots.map((sl) => (
                            <button
                              key={sl.start}
                              type="button"
                              disabled={!sl.available}
                              onClick={() => {
                                setSelectedSlot(sl)
                                setStep('form')
                              }}
                              className={[
                                'rounded-xl border px-2 py-2.5 text-sm font-semibold transition',
                                !sl.available
                                  ? 'cursor-not-allowed border-slate-100 bg-slate-50 text-slate-300 line-through'
                                  : selectedSlot?.start === sl.start
                                    ? 'border-teal-500 bg-teal-500 text-white'
                                    : 'border-slate-200 hover:border-teal-400 hover:bg-teal-50',
                              ].join(' ')}
                            >
                              {sl.start}
                            </button>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  )}

                  {step === 'form' && selectedSlot && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex flex-col gap-4"
                    >
                      <Button
                        size="small"
                        startIcon={<ArrowBackRounded />}
                        onClick={() => setStep('slot')}
                        sx={{ alignSelf: 'flex-start' }}
                      >
                        Vaqtlar
                      </Button>
                      <div className="rounded-xl bg-teal-50 px-3 py-2.5 text-sm font-medium text-teal-900">
                        {formatDateHuman(selectedDate)} · {selectedSlot.start}–
                        {selectedSlot.end}
                      </div>
                      <div className="flex items-center gap-2 text-slate-700">
                        <PersonRounded fontSize="small" />
                        <Typography className="!font-semibold">Ma’lumotlaringiz</Typography>
                      </div>
                      <div className="flex flex-col gap-5">
                        <TextField
                          fullWidth
                          label="Ism familiya"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          required
                        />
                        <PhoneField
                          label="Telefon raqam"
                          value={phone}
                          onChange={setPhone}
                          required
                        />
                        <TextField
                          fullWidth
                          multiline
                          minRows={3}
                          label="Murojaat haqida"
                          value={purpose}
                          onChange={(e) => setPurpose(e.target.value)}
                          placeholder="Nima bo‘yicha kelmoqchisiz?"
                        />
                      </div>
                      <Button
                        fullWidth
                        size="large"
                        variant="contained"
                        disabled={!formValid || submitting}
                        onClick={() => void submit()}
                        sx={{ mt: 0.5 }}
                      >
                        {submitting ? 'Yuborilmoqda…' : 'Bron qilish'}
                      </Button>
                    </motion.div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
      <Snackbar
        open={Boolean(snack)}
        autoHideDuration={4000}
        onClose={() => setSnack('')}
        message={snack}
      />
    </ThemeProvider>
  )
}
