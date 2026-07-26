import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
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
  AssignmentRounded,
  BarChartRounded,
  DeleteOutlineRounded,
  EditRounded,
  InboxRounded,
  LockRounded,
  PublishRounded,
  RefreshRounded,
  SearchRounded,
} from '@mui/icons-material'
import {
  closeSurvey,
  deleteSurvey,
  listSurveys,
  publishSurvey,
} from '../api/surveys'
import { ApiError } from '../api/client'
import type { Survey, SurveyStatus } from '../api/types'
import { STATUS_META, descriptionToPlain } from '../lib/survey'
import { SurveyResponseUrl } from '../components/surveys/SurveyResponseUrl'
import { useSnack } from '../ui/SnackProvider'

const headingFont = { fontFamily: "'Outfit', sans-serif" }
const fadeUp = { hidden: { opacity: 0, y: 18 }, show: { opacity: 1, y: 0 } }

type StatusFilter = 'all' | SurveyStatus

const FILTERS: { id: StatusFilter; label: string }[] = [
  { id: 'all', label: 'Barchasi' },
  { id: 'draft', label: 'Loyihalar' },
  { id: 'published', label: 'Nashr' },
  { id: 'closed', label: 'Yopilgan' },
]

function formatDate(iso?: string | null) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('uz-UZ', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function SurveysSection() {
  const { showSnack } = useSnack()
  const navigate = useNavigate()
  const [surveys, setSurveys] = useState<Survey[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [confirm, setConfirm] = useState<{
    type: 'delete' | 'publish' | 'close'
    survey: Survey
  } | null>(null)
  const [busy, setBusy] = useState(false)

  const load = async () => {
    try {
      const data = await listSurveys()
      setSurveys(data ?? [])
    } catch (err) {
      showSnack(
        err instanceof ApiError ? err.message : 'So‘rovnomalarni yuklab bo‘lmadi',
        'error',
      )
    }
  }

  useEffect(() => {
    setLoading(true)
    void load().finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const counts = useMemo(
    () => ({
      all: surveys.length,
      draft: surveys.filter((s) => s.status === 'draft').length,
      published: surveys.filter((s) => s.status === 'published').length,
      closed: surveys.filter((s) => s.status === 'closed').length,
    }),
    [surveys],
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return surveys
      .filter((s) => statusFilter === 'all' || s.status === statusFilter)
      .filter((s) => {
        if (!q) return true
        const desc = descriptionToPlain(s.description)
        return (
          s.title.toLowerCase().includes(q) ||
          s.slug.toLowerCase().includes(q) ||
          desc.toLowerCase().includes(q)
        )
      })
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
  }, [surveys, statusFilter, query])

  const runConfirm = async () => {
    if (!confirm) return
    setBusy(true)
    try {
      const key = confirm.survey.slug || confirm.survey.id
      if (confirm.type === 'delete') {
        await deleteSurvey(key)
        showSnack('So‘rovnoma o‘chirildi', 'success')
      } else if (confirm.type === 'publish') {
        await publishSurvey(key)
        showSnack('So‘rovnoma nashr qilindi', 'success')
      } else {
        await closeSurvey(key)
        showSnack('So‘rovnoma yopildi', 'success')
      }
      setConfirm(null)
      await load()
    } catch (err) {
      showSnack(err instanceof ApiError ? err.message : 'Amalda xato', 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
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
            So‘rovnomalar
          </Typography>
          <Typography className="!mt-2 !text-[0.9rem] !text-slate-300">
            Google Forms uslubida yarating, nashr eting va javoblarni ko‘ring
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
              '&:hover': { borderColor: 'white', bgcolor: 'rgba(255,255,255,0.08)' },
            }}
          >
            Yangilash
          </Button>
          <Button
            variant="outlined"
            startIcon={<InboxRounded />}
            onClick={() => navigate('/surveys/responses')}
            sx={{
              borderColor: 'rgba(255,255,255,0.3)',
              color: 'white',
              '&:hover': { borderColor: 'white', bgcolor: 'rgba(255,255,255,0.08)' },
            }}
          >
            Javoblar
          </Button>
          <Button
            variant="contained"
            startIcon={<AddRounded />}
            onClick={() => navigate('/surveys/new')}
            sx={{ bgcolor: 'white', color: '#0f766e', '&:hover': { bgcolor: '#f0fdfa' } }}
          >
            Yangi so‘rovnoma
          </Button>
        </div>
      </motion.section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {FILTERS.map((f) => {
          const active = statusFilter === f.id
          const value = counts[f.id]
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => setStatusFilter(f.id)}
              className={`rounded-2xl border bg-white p-4 text-left shadow-sm transition ${
                active
                  ? 'border-teal-600 ring-2 ring-teal-600/20'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="grid h-9 w-9 place-items-center rounded-lg bg-slate-100 text-slate-600">
                  <AssignmentRounded fontSize="small" />
                </span>
                <span className="text-2xl font-bold tabular-nums text-slate-900">{value}</span>
              </div>
              <p className="mt-2 text-sm font-medium text-slate-600">{f.label}</p>
            </button>
          )
        })}
      </section>

      <motion.section
        variants={fadeUp}
        className="rounded-[1.35rem] bg-white p-3.5 shadow-sm ring-1 ring-slate-200/80 sm:p-4"
      >
        <TextField
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Qidirish: sarlavha, slug, tavsif..."
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
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <AnimatePresence mode="popLayout">
            {filtered.map((item, index) => {
              const meta = STATUS_META[item.status]
              const desc = descriptionToPlain(item.description)
              const qCount = item.questionCount ?? item.questions?.length ?? 0
              const key = item.slug || item.id
              return (
                <motion.article
                  key={item.id}
                  layout
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ delay: index * 0.03 }}
                  className="flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:border-teal-200 hover:shadow-md"
                >
                  <div className="border-b border-slate-100 bg-slate-50/60 px-5 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="truncate text-base font-semibold text-slate-900">
                          {item.title || 'Nomsiz'}
                        </h3>
                        <p className="mt-0.5 font-mono text-xs text-slate-500">{item.slug}</p>
                      </div>
                      <Chip
                        size="small"
                        label={meta.label}
                        sx={{ fontWeight: 600, bgcolor: meta.bg, color: meta.color }}
                      />
                    </div>
                  </div>

                  <div className="flex flex-1 flex-col px-5 py-4">
                    {desc ? (
                      <p className="mb-4 line-clamp-2 text-sm leading-relaxed text-slate-600">
                        {desc}
                      </p>
                    ) : (
                      <p className="mb-4 text-sm italic text-slate-400">Tavsif kiritilmagan</p>
                    )}

                    {item.responseUrl && (
                      <div className="mb-4 rounded-xl border border-slate-100 bg-slate-50/80 p-3">
                        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                          Javob berish havolasi
                        </p>
                        <SurveyResponseUrl
                          url={item.responseUrl}
                          status={item.status}
                          variant="card"
                        />
                      </div>
                    )}

                    <div className="mt-auto grid grid-cols-2 gap-2 text-xs text-slate-500">
                      <div className="rounded-lg bg-slate-50 px-2.5 py-2">{qCount} savol</div>
                      <div className="rounded-lg bg-slate-50 px-2.5 py-2">
                        Tartib: {item.sortOrder ?? 0}
                      </div>
                      <div className="col-span-2 rounded-lg bg-slate-50 px-2.5 py-2">
                        Yangilangan: {formatDate(item.updatedAt)}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 border-t border-slate-100 px-4 py-3">
                    <Button
                      component={Link}
                      to={`/surveys/${key}/edit`}
                      size="small"
                      variant="outlined"
                      startIcon={<EditRounded />}
                    >
                      {item.status === 'closed' ? 'Ko‘rish' : 'Tahrirlash'}
                    </Button>
                    <div className="flex items-center gap-0.5">
                      <Tooltip title="Javoblar">
                        <IconButton
                          size="small"
                          onClick={() => navigate(`/surveys/${key}/responses`)}
                        >
                          <BarChartRounded fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      {item.status === 'draft' && (
                        <Tooltip title="Nashr qilish">
                          <IconButton
                            size="small"
                            color="success"
                            onClick={() => setConfirm({ type: 'publish', survey: item })}
                          >
                            <PublishRounded fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                      {item.status === 'published' && (
                        <Tooltip title="Yopish">
                          <IconButton
                            size="small"
                            color="warning"
                            onClick={() => setConfirm({ type: 'close', survey: item })}
                          >
                            <LockRounded fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                      <Tooltip title="O‘chirish">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => setConfirm({ type: 'delete', survey: item })}
                        >
                          <DeleteOutlineRounded fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </div>
                  </div>
                </motion.article>
              )
            })}
          </AnimatePresence>

          {filtered.length === 0 && (
            <div className="col-span-full rounded-2xl border border-dashed border-slate-200 py-16 text-center">
              <Typography color="text.secondary">So‘rovnoma topilmadi</Typography>
            </div>
          )}
        </div>
      )}

      <Dialog open={Boolean(confirm)} onClose={() => !busy && setConfirm(null)}>
        <DialogTitle>
          {confirm?.type === 'delete'
            ? 'O‘chirish'
            : confirm?.type === 'publish'
              ? 'Nashr qilish'
              : 'Yopish'}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            {confirm?.type === 'delete' &&
              `«${confirm.survey.title}» so‘rovnomasini o‘chirishni tasdiqlaysizmi?`}
            {confirm?.type === 'publish' &&
              `«${confirm?.survey.title}» nashr qilinadi. Davom etasizmi?`}
            {confirm?.type === 'close' &&
              `«${confirm?.survey.title}» yopiladi va tahrirlab bo‘lmaydi.`}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirm(null)} disabled={busy}>
            Bekor qilish
          </Button>
          <Button
            variant="contained"
            color={confirm?.type === 'delete' ? 'error' : 'primary'}
            onClick={() => void runConfirm()}
            disabled={busy}
          >
            {busy ? 'Kutilmoqda...' : 'Tasdiqlash'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
