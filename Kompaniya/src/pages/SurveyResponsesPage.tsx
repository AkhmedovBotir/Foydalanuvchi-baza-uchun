import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import {
  ArrowBackRounded,
  ChevronLeftRounded,
  ChevronRightRounded,
  DeleteOutlineRounded,
  RefreshRounded,
  VisibilityRounded,
} from '@mui/icons-material'
import {
  deleteResponse,
  getResponse,
  getSurveyResponsesSummary,
  listAllResponses,
  listSurveys,
  listSurveyResponses,
} from '../api/surveys'
import { ApiError } from '../api/client'
import type {
  ResponseSummary,
  Survey,
  SurveyResponseDetail,
  SurveyResponseItem,
} from '../api/types'
import { STATUS_META } from '../lib/survey'
import { SurveyResponseDetailModal } from '../components/surveys/SurveyResponseDetailModal'
import { useSnack } from '../ui/SnackProvider'

const headingFont = { fontFamily: "'Outfit', sans-serif" }
const PAGE_SIZE = 20

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0 },
}

function formatDate(value?: string | null) {
  if (!value) return '—'
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

function answersPreview(answers: Record<string, unknown>): string {
  const entries = Object.entries(answers ?? {})
  if (!entries.length) return 'Bo‘sh javob'
  const parts = entries.slice(0, 2).map(([, value]) => {
    if (Array.isArray(value)) {
      if (value.length && typeof value[0] === 'object') return `${value.length} ta fayl`
      return value.map((v) => String(v)).join(', ')
    }
    if (value && typeof value === 'object') {
      const o = value as Record<string, unknown>
      if (o.url || o.path) return 'Fayl'
      return JSON.stringify(value)
    }
    const s = String(value)
    if (s.includes('/uploads/') || s.includes('/files/')) return 'Fayl'
    return s
  })
  return parts.join(' · ') + (entries.length > 2 ? '…' : '')
}

export function SurveyResponsesPage() {
  const { id: routeSurveyId } = useParams<{ id: string }>()
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const { showSnack } = useSnack()

  const filterSurvey =
    routeSurveyId || searchParams.get('survey') || ''

  const [surveys, setSurveys] = useState<Survey[]>([])
  const [items, setItems] = useState<SurveyResponseItem[]>([])
  const [summary, setSummary] = useState<ResponseSummary | null>(null)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [limit, setLimit] = useState(PAGE_SIZE)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const [detail, setDetail] = useState<SurveyResponseDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const totalPages = Math.max(1, Math.ceil(total / Math.max(1, limit)))
  const isScoped = Boolean(routeSurveyId)
  const title =
    summary?.surveyTitle ||
    surveys.find((s) => s.slug === filterSurvey || s.id === filterSurvey)?.title ||
    'So‘rovnoma javoblari'

  const statusMeta = summary?.surveyStatus
    ? STATUS_META[summary.surveyStatus]
    : null

  const loadSurveys = useCallback(async () => {
    try {
      setSurveys((await listSurveys()) ?? [])
    } catch {
      /* optional for filter */
    }
  }, [])

  const loadSummary = useCallback(async () => {
    if (!filterSurvey) {
      setSummary(null)
      return
    }
    try {
      setSummary(await getSurveyResponsesSummary(filterSurvey))
    } catch {
      setSummary(null)
    }
  }, [filterSurvey])

  const loadResponses = useCallback(async () => {
    const params = { page, limit: PAGE_SIZE }
    const result = filterSurvey
      ? await listSurveyResponses(filterSurvey, params)
      : await listAllResponses(params)
    setItems(result.data)
    setTotal(result.total)
    setLimit(result.limit || PAGE_SIZE)
  }, [filterSurvey, page])

  const loadAll = useCallback(async () => {
    try {
      await Promise.all([loadSummary(), loadResponses()])
    } catch (err) {
      showSnack(
        err instanceof ApiError ? err.message : 'Javoblarni yuklab bo‘lmadi',
        'error',
      )
      setItems([])
      setTotal(0)
    }
  }, [loadSummary, loadResponses, showSnack])

  useEffect(() => {
    void loadSurveys()
  }, [loadSurveys])

  useEffect(() => {
    setLoading(true)
    void loadAll().finally(() => setLoading(false))
  }, [loadAll])

  useEffect(() => {
    setPage(1)
  }, [filterSurvey])

  const handleRefresh = async () => {
    setRefreshing(true)
    await loadAll()
    setRefreshing(false)
  }

  const handleSurveyFilter = (value: string) => {
    if (isScoped) {
      if (value) navigate(`/surveys/${value}/responses`)
      else navigate('/surveys/responses')
      return
    }
    const next = new URLSearchParams(searchParams)
    if (value) next.set('survey', value)
    else next.delete('survey')
    setSearchParams(next, { replace: true })
    setPage(1)
  }

  const openDetail = async (responseId: string) => {
    setDetailLoading(true)
    setDetail(null)
    try {
      setDetail(await getResponse(responseId))
    } catch (err) {
      showSnack(err instanceof ApiError ? err.message : 'Yuklashda xato', 'error')
    } finally {
      setDetailLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    setDeleting(true)
    try {
      await deleteResponse(deleteId)
      showSnack('Javob o‘chirildi', 'success')
      setDeleteId(null)
      setDetail(null)
      await loadAll()
    } catch (err) {
      showSnack(err instanceof ApiError ? err.message : 'O‘chirishda xato', 'error')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      <motion.section
        variants={fadeUp}
        className="flex flex-col gap-4 rounded-[1.5rem] bg-slate-950 px-5 py-6 text-white sm:flex-row sm:items-center sm:justify-between sm:px-7"
      >
        <div className="flex items-center gap-3">
          <IconButton
            onClick={() => navigate(isScoped ? `/surveys/${routeSurveyId}/edit` : '/surveys')}
            sx={{
              color: 'white',
              bgcolor: 'rgba(255,255,255,0.08)',
              '&:hover': { bgcolor: 'rgba(255,255,255,0.16)' },
            }}
          >
            <ArrowBackRounded />
          </IconButton>
          <div>
            <Typography
              variant="h4"
              sx={{
                ...headingFont,
                fontWeight: 800,
                fontSize: { xs: '1.35rem', sm: '1.6rem' },
              }}
            >
              {isScoped || filterSurvey ? title : 'Barcha javoblar'}
            </Typography>
            <Typography className="!mt-1 !text-[0.85rem] !text-slate-300">
              Jami {summary?.totalResponses ?? total} ta javob
              {statusMeta ? ` · ${statusMeta.label}` : ''}
            </Typography>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outlined"
            startIcon={
              refreshing ? <CircularProgress size={16} color="inherit" /> : <RefreshRounded />
            }
            disabled={refreshing}
            onClick={() => void handleRefresh()}
            sx={{
              borderColor: 'rgba(255,255,255,0.3)',
              color: 'white',
              '&:hover': { borderColor: 'white', bgcolor: 'rgba(255,255,255,0.08)' },
            }}
          >
            Yangilash
          </Button>
          {!isScoped && (
            <Button
              component={Link}
              to="/surveys"
              variant="contained"
              sx={{ bgcolor: 'white', color: '#0f766e', '&:hover': { bgcolor: '#f0fdfa' } }}
            >
              So‘rovnomalar
            </Button>
          )}
        </div>
      </motion.section>

      <motion.section
        variants={fadeUp}
        className="rounded-[1.35rem] bg-white p-4 shadow-sm ring-1 ring-slate-200/80"
      >
        <TextField
          select
          size="small"
          label="So‘rovnoma"
          value={filterSurvey}
          onChange={(e) => handleSurveyFilter(e.target.value)}
          sx={{ minWidth: { xs: '100%', sm: 320 } }}
          disabled={isScoped}
        >
          {!isScoped && <MenuItem value="">Barcha so‘rovnomalar</MenuItem>}
          {surveys.map((s) => (
            <MenuItem key={s.id} value={s.slug || s.id}>
              {s.title}
            </MenuItem>
          ))}
        </TextField>
      </motion.section>

      {filterSurvey && (
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Jami" value={summary?.totalResponses ?? total} />
          <StatCard label="Bugun" value={summary?.todayResponses ?? 0} />
          <StatCard label="Shu hafta" value={summary?.weekResponses ?? 0} />
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Oxirgi javob
            </p>
            <p className="mt-2 text-sm font-medium text-slate-800">
              {formatDate(summary?.lastResponseAt)}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Birinchi: {formatDate(summary?.firstResponseAt)}
            </p>
          </div>
        </section>
      )}

      <motion.section
        variants={fadeUp}
        className="overflow-hidden rounded-[1.35rem] bg-white shadow-sm ring-1 ring-slate-200/80"
      >
        {loading ? (
          <Box className="grid place-items-center py-20">
            <CircularProgress />
          </Box>
        ) : items.length === 0 ? (
          <div className="m-4 rounded-2xl border border-dashed border-slate-200 py-14 text-center">
            <Typography color="text.secondary">Hali javoblar yo‘q</Typography>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-semibold">#</th>
                    <th className="px-4 py-3 font-semibold">Ism familiya</th>
                    <th className="px-4 py-3 font-semibold">Telefon</th>
                    {!filterSurvey && (
                      <th className="px-4 py-3 font-semibold">So‘rovnoma</th>
                    )}
                    <th className="px-4 py-3 font-semibold">Javoblar</th>
                    <th className="px-4 py-3 font-semibold">Sana</th>
                    <th className="px-4 py-3 font-semibold text-right">Amallar</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((resp, i) => (
                    <tr
                      key={resp.id}
                      className="cursor-pointer border-t border-slate-100 transition hover:bg-slate-50/80"
                      onClick={() => void openDetail(resp.id)}
                    >
                      <td className="px-4 py-3 font-mono text-xs text-slate-500">
                        {(page - 1) * limit + i + 1}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-900">
                        {resp.name || '—'}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                        {resp.phone || '—'}
                      </td>
                      {!filterSurvey && (
                        <td className="px-4 py-3 text-slate-700">
                          <span className="line-clamp-1">
                            {resp.surveyTitle || resp.surveySlug || '—'}
                          </span>
                        </td>
                      )}
                      <td className="max-w-xs px-4 py-3 text-slate-600">
                        <span className="line-clamp-2">{answersPreview(resp.answers)}</span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                        {formatDate(resp.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-0.5">
                          <Tooltip title="Ko‘rish">
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation()
                                void openDetail(resp.id)
                              }}
                            >
                              <VisibilityRounded fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="O‘chirish">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={(e) => {
                                e.stopPropagation()
                                setDeleteId(resp.id)
                              }}
                            >
                              <DeleteOutlineRounded fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3">
              <Typography variant="body2" color="text.secondary">
                {total} tadan {(page - 1) * limit + 1}–
                {Math.min(page * limit, total)}
              </Typography>
              <div className="flex items-center gap-1">
                <IconButton
                  size="small"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeftRounded />
                </IconButton>
                <span className="px-2 text-sm tabular-nums text-slate-700">
                  {page} / {totalPages}
                </span>
                <IconButton
                  size="small"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  <ChevronRightRounded />
                </IconButton>
              </div>
            </div>
          </>
        )}
      </motion.section>

      <SurveyResponseDetailModal
        open={detailLoading || Boolean(detail)}
        loading={detailLoading}
        detail={detail}
        fallbackTitle={title}
        onClose={() => {
          if (!detailLoading) setDetail(null)
        }}
        onDelete={(id) => setDeleteId(id)}
      />

      <Dialog open={Boolean(deleteId)} onClose={() => !deleting && setDeleteId(null)}>
        <DialogTitle>Javobni o‘chirish</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            Bu javobni o‘chirishni tasdiqlaysizmi? Bu amalni qaytarib bo‘lmaydi.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteId(null)} disabled={deleting}>
            Bekor qilish
          </Button>
          <Button
            color="error"
            variant="contained"
            onClick={() => void handleDelete()}
            disabled={deleting}
          >
            {deleting ? 'O‘chirilmoqda...' : 'O‘chirish'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900">{value}</p>
    </div>
  )
}
