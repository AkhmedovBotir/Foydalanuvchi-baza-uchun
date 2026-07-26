import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
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
  FormControlLabel,
  IconButton,
  Stack,
  Switch,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material'
import {
  ArrowBackRounded,
  LockRounded,
  PublishRounded,
  SaveRounded,
} from '@mui/icons-material'
import {
  closeSurvey,
  createSurvey,
  getSurvey,
  publishSurvey,
  updateSurvey,
} from '../api/surveys'
import { ApiError } from '../api/client'
import type { Question, RespondentField, SurveySettings, SurveyStatus } from '../api/types'
import {
  STATUS_META,
  countAnswerable,
  createQuestion,
  defaultSettings,
  isValidSlug,
  slugify,
  syncSlugWithTitle,
} from '../lib/survey'
import { SurveyQuestionEditor } from '../components/surveys/SurveyQuestionEditor'
import { AddQuestionTrigger } from '../components/surveys/AddQuestionPicker'
import { SurveyResponseUrl } from '../components/surveys/SurveyResponseUrl'
import { useSnack } from '../ui/SnackProvider'

const headingFont = { fontFamily: "'Outfit', sans-serif" }
const fadeUp = { hidden: { opacity: 0, y: 18 }, show: { opacity: 1, y: 0 } }

type EditTab = 'info' | 'settings' | 'questions'

type SurveyForm = {
  slug: string
  title: string
  description: string
  sortOrder: string
  settings: SurveySettings
  questions: Question[]
  respondentFields: RespondentField[]
  status: SurveyStatus
  createdAt?: string
  updatedAt?: string
  publishedAt?: string | null
  closedAt?: string | null
  responseUrl?: string
}

const emptyForm: SurveyForm = {
  slug: '',
  title: '',
  description: '',
  sortOrder: '0',
  settings: defaultSettings(),
  questions: [createQuestion('short_text')],
  respondentFields: [],
  status: 'draft',
}

function formatDateTime(iso?: string | null) {
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

export function SurveyEditorPage() {
  const { id } = useParams<{ id: string }>()
  const isNew = !id
  const navigate = useNavigate()
  const { showSnack } = useSnack()

  const [form, setForm] = useState<SurveyForm>(emptyForm)
  const [activeTab, setActiveTab] = useState<EditTab>('info')
  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [publishOpen, setPublishOpen] = useState(false)
  const [closeOpen, setCloseOpen] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [addQuestionOpen, setAddQuestionOpen] = useState(false)

  const isClosed = form.status === 'closed'
  const answerableCount = countAnswerable(form.questions)
  const sectionCount = form.questions.filter((q) => q.type === 'section').length
  const status = STATUS_META[form.status]

  const load = useCallback(async () => {
    if (!id) {
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const survey = await getSurvey(id)
      setForm({
        slug: survey.slug,
        title: survey.title,
        description: survey.description ?? '',
        sortOrder: String(survey.sortOrder ?? 0),
        settings: { ...defaultSettings(), ...(survey.settings ?? {}) },
        questions: survey.questions?.length
          ? survey.questions
          : [createQuestion('short_text')],
        respondentFields: survey.respondentFields ?? [],
        status: survey.status,
        createdAt: survey.createdAt,
        updatedAt: survey.updatedAt,
        publishedAt: survey.publishedAt,
        closedAt: survey.closedAt,
        responseUrl: survey.responseUrl,
      })
    } catch (err) {
      showSnack(err instanceof ApiError ? err.message : 'Yuklashda xato', 'error')
      navigate('/surveys')
    } finally {
      setLoading(false)
    }
  }, [id, navigate, showSnack])

  useEffect(() => {
    if (!isNew) void load()
  }, [isNew, load])

  const handleTitleChange = (title: string) => {
    setForm((f) => ({
      ...f,
      title,
      slug: syncSlugWithTitle(title, isNew, f.slug),
    }))
  }

  const buildBody = () => ({
    slug: form.slug.trim(),
    title: form.title.trim(),
    description: form.description.trim() || undefined,
    settings: {
      collectEmail: form.settings.collectEmail,
      shuffleQuestions: form.settings.shuffleQuestions,
      showProgressBar: form.settings.showProgressBar,
      confirmationMessage: form.settings.confirmationMessage?.trim() || undefined,
    },
    questions: form.questions,
    sortOrder: form.sortOrder !== '' ? Number(form.sortOrder) : 0,
  })

  const validateForm = (): string | null => {
    if (!form.slug.trim() || !form.title.trim()) return 'Slug va sarlavha majburiy'
    if (!isValidSlug(form.slug)) return 'Slug: faqat kichik harf, raqam va tire'
    if (form.questions.length === 0) return 'Kamida bitta savol qo‘shing'
    for (const q of form.questions) {
      if (q.type !== 'section' && !q.title?.trim()) {
        return `«${q.id}» savolida matn bo‘sh`
      }
    }
    return null
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (isClosed) return
    const validationError = validateForm()
    if (validationError) {
      showSnack(validationError, 'warning')
      return
    }
    setSaving(true)
    try {
      const body = buildBody()
      if (isNew) {
        const created = await createSurvey(body)
        showSnack('So‘rovnoma yaratildi', 'success')
        navigate(`/surveys/${created.slug || created.id}/edit`, { replace: true })
      } else if (id) {
        await updateSurvey(id, body)
        showSnack('So‘rovnoma saqlandi', 'success')
        await load()
      }
    } catch (err) {
      showSnack(err instanceof ApiError ? err.message : 'Saqlashda xato', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handlePublish = async () => {
    if (!id) return
    const validationError = validateForm()
    if (validationError) {
      showSnack(validationError, 'warning')
      setPublishOpen(false)
      return
    }
    setActionLoading(true)
    try {
      if (!isClosed) await updateSurvey(id, buildBody())
      await publishSurvey(id)
      setPublishOpen(false)
      showSnack('So‘rovnoma nashr qilindi', 'success')
      await load()
    } catch (err) {
      showSnack(err instanceof ApiError ? err.message : 'Nashr qilishda xato', 'error')
    } finally {
      setActionLoading(false)
    }
  }

  const handleClose = async () => {
    if (!id) return
    setActionLoading(true)
    try {
      await closeSurvey(id)
      setCloseOpen(false)
      showSnack('So‘rovnoma yopildi', 'success')
      await load()
    } catch (err) {
      showSnack(err instanceof ApiError ? err.message : 'Yopishda xato', 'error')
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) {
    return (
      <Box className="grid place-items-center py-24">
        <CircularProgress />
      </Box>
    )
  }

  return (
    <>
      <motion.section
        variants={fadeUp}
        className="flex flex-col gap-4 rounded-[1.5rem] bg-slate-950 px-5 py-6 text-white sm:flex-row sm:items-center sm:justify-between sm:px-7"
      >
        <div className="flex items-center gap-3">
          <IconButton
            onClick={() => navigate('/surveys')}
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
              {isNew ? 'Yangi so‘rovnoma' : form.title || 'So‘rovnomani tahrirlash'}
            </Typography>
            <Typography className="!mt-1 !text-[0.85rem] !text-slate-300">
              {isNew
                ? 'Google Forms uslubida so‘rovnoma yarating'
                : `${answerableCount} javobli savol · ${sectionCount} bo‘lim`}
            </Typography>
          </div>
        </div>
      </motion.section>

      {isClosed && (
        <motion.div
          variants={fadeUp}
          className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
        >
          Bu so‘rovnoma yopilgan — tahrirlash mumkin emas. Faqat ko‘rish rejimida.
        </motion.div>
      )}

      <div className="grid items-stretch gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="flex min-h-0 min-w-0 flex-col">
          <Tabs
            value={activeTab}
            onChange={(_, v: EditTab) => setActiveTab(v)}
            sx={{ mb: 2, borderBottom: 1, borderColor: 'divider', flexShrink: 0 }}
          >
            <Tab value="info" label="Asosiy" />
            <Tab value="settings" label="Sozlamalar" />
            <Tab value="questions" label="Savollar" />
          </Tabs>

          <Box
            component="form"
            onSubmit={handleSubmit}
            className={
              activeTab === 'questions' ? 'flex min-h-0 flex-1 flex-col' : undefined
            }
          >
            {activeTab === 'info' && (
              <motion.section
                variants={fadeUp}
                className="rounded-[1.35rem] bg-white p-5 shadow-sm ring-1 ring-slate-200/80 sm:p-6"
              >
                <Typography sx={{ ...headingFont, fontWeight: 700, mb: 0.5 }}>
                  Asosiy ma’lumotlar
                </Typography>
                <Typography variant="body2" color="text.secondary" className="!mb-4">
                  Sarlavha, identifikator va tavsif
                </Typography>
                <Stack spacing={2.5}>
                  <TextField
                    label="Sarlavha"
                    value={form.title}
                    onChange={(e) => handleTitleChange(e.target.value)}
                    required
                    disabled={isClosed}
                    fullWidth
                    placeholder="Foydalanuvchi tajribasi so‘rovnomasi"
                  />
                  <TextField
                    label="Slug"
                    value={form.slug}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, slug: slugify(e.target.value) }))
                    }
                    disabled={isClosed}
                    fullWidth
                    helperText="Public havolada ishlatiladi: faqat a-z, 0-9 va tire"
                    error={form.slug.length > 0 && !isValidSlug(form.slug)}
                  />
                  <TextField
                    label="Tartib raqami"
                    value={form.sortOrder}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        sortOrder: e.target.value.replace(/[^\d-]/g, ''),
                      }))
                    }
                    disabled={isClosed}
                    sx={{ maxWidth: 200 }}
                    helperText="Ro‘yxatda ko‘rsatish tartibi"
                  />
                  <TextField
                    label="Tavsif"
                    value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    disabled={isClosed}
                    fullWidth
                    multiline
                    minRows={3}
                    placeholder="So‘rovnoma haqida qisqacha ma’lumot..."
                  />
                </Stack>
              </motion.section>
            )}

            {activeTab === 'settings' && (
              <motion.section
                variants={fadeUp}
                className="rounded-[1.35rem] bg-white p-5 shadow-sm ring-1 ring-slate-200/80 sm:p-6"
              >
                <Typography sx={{ ...headingFont, fontWeight: 700, mb: 0.5 }}>
                  Forma sozlamalari
                </Typography>
                <Typography variant="body2" color="text.secondary" className="!mb-4">
                  Foydalanuvchi uchun ko‘rinish va xatti-harakat
                </Typography>
                <Stack spacing={1}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={Boolean(form.settings.collectEmail)}
                        disabled={isClosed}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            settings: { ...f.settings, collectEmail: e.target.checked },
                          }))
                        }
                      />
                    }
                    label="Email maydoni"
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={Boolean(form.settings.shuffleQuestions)}
                        disabled={isClosed}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            settings: { ...f.settings, shuffleQuestions: e.target.checked },
                          }))
                        }
                      />
                    }
                    label="Savollarni aralashtirish"
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={Boolean(form.settings.showProgressBar)}
                        disabled={isClosed}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            settings: { ...f.settings, showProgressBar: e.target.checked },
                          }))
                        }
                      />
                    }
                    label="Progress bar ko‘rsatish"
                  />
                  <TextField
                    label="Tasdiqlash xabari"
                    value={form.settings.confirmationMessage ?? ''}
                    disabled={isClosed}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        settings: { ...f.settings, confirmationMessage: e.target.value },
                      }))
                    }
                    fullWidth
                    multiline
                    minRows={3}
                    helperText="Javob yuborilgandan keyin ko‘rsatiladi"
                    sx={{ mt: 1 }}
                  />
                </Stack>
              </motion.section>
            )}

            {activeTab === 'questions' && (
              <div className="flex min-h-0 flex-1 flex-col">
                <SurveyQuestionEditor
                  questions={form.questions}
                  onChange={(questions) => setForm((f) => ({ ...f, questions }))}
                  disabled={isClosed}
                  addOpen={addQuestionOpen}
                  onAddOpenChange={setAddQuestionOpen}
                />
              </div>
            )}
          </Box>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
              Holat
            </p>
            <Chip
              size="small"
              label={status.label}
              sx={{ mb: 2, fontWeight: 600, bgcolor: status.bg, color: status.color }}
            />
            <dl className="space-y-2.5 text-sm">
              <div className="flex justify-between gap-2">
                <dt className="text-slate-500">Savollar</dt>
                <dd className="font-medium text-slate-900">{answerableCount}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-slate-500">Bo‘limlar</dt>
                <dd className="font-medium text-slate-900">{sectionCount}</dd>
              </div>
              {!isNew && (
                <>
                  <div className="flex justify-between gap-2 border-t border-slate-100 pt-2">
                    <dt className="text-slate-500">Yaratilgan</dt>
                    <dd className="text-right text-xs text-slate-700">
                      {formatDateTime(form.createdAt)}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-slate-500">Yangilangan</dt>
                    <dd className="text-right text-xs text-slate-700">
                      {formatDateTime(form.updatedAt)}
                    </dd>
                  </div>
                  {form.publishedAt && (
                    <div className="flex justify-between gap-2">
                      <dt className="text-slate-500">Nashr</dt>
                      <dd className="text-right text-xs text-emerald-700">
                        {formatDateTime(form.publishedAt)}
                      </dd>
                    </div>
                  )}
                  {form.closedAt && (
                    <div className="flex justify-between gap-2">
                      <dt className="text-slate-500">Yopilgan</dt>
                      <dd className="text-right text-xs text-amber-700">
                        {formatDateTime(form.closedAt)}
                      </dd>
                    </div>
                  )}
                </>
              )}
            </dl>
          </div>

          {!isNew && form.responseUrl && (
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                Javob berish havolasi
              </p>
              <SurveyResponseUrl url={form.responseUrl} status={form.status} variant="full" />
            </div>
          )}

          {form.respondentFields.length > 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                Javob beruvchidan
              </p>
              <p className="mb-3 text-xs text-slate-500">
                Forma ochilganda avtomatik so‘raladi (API).
              </p>
              <ul className="space-y-2">
                {form.respondentFields.map((field) => (
                  <li
                    key={field.key}
                    className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm"
                  >
                    <span className="font-medium text-slate-800">{field.label}</span>
                    <span className="text-xs text-slate-500">
                      {field.key}
                      {field.required ? ' · majburiy' : ''}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {!isNew && (
            <Button
              component={Link}
              to={`/surveys/${form.slug || id}/responses`}
              fullWidth
              variant="outlined"
            >
              Javoblarni ko‘rish
            </Button>
          )}

          {!isNew && !isClosed && (form.status === 'draft' || form.status === 'published') && (
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                Amallar
              </p>
              <Stack spacing={1}>
                {form.status === 'draft' && (
                  <Button
                    fullWidth
                    variant="contained"
                    startIcon={<PublishRounded />}
                    onClick={() => setPublishOpen(true)}
                    disabled={actionLoading}
                  >
                    Nashr qilish
                  </Button>
                )}
                {form.status === 'published' && (
                  <Button
                    fullWidth
                    variant="outlined"
                    color="warning"
                    startIcon={<LockRounded />}
                    onClick={() => setCloseOpen(true)}
                    disabled={actionLoading}
                  >
                    Yopish
                  </Button>
                )}
              </Stack>
              {form.status === 'draft' && (
                <p className="mt-3 text-xs text-slate-500">
                  Nashr uchun kamida 1 ta javobli savol kerak (bo‘lim hisoblanmaydi).
                </p>
              )}
            </div>
          )}

          {!isClosed && (
            <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              {activeTab === 'questions' && (
                <AddQuestionTrigger
                  onClick={() => setAddQuestionOpen(true)}
                  disabled={isClosed}
                />
              )}
              <Stack direction="row" spacing={1}>
                <Button
                  component={Link}
                  to="/surveys"
                  variant="outlined"
                  fullWidth
                  disabled={saving}
                >
                  Bekor qilish
                </Button>
                <Button
                  type="button"
                  variant="contained"
                  fullWidth
                  disabled={saving}
                  startIcon={
                    saving ? <CircularProgress size={18} color="inherit" /> : <SaveRounded />
                  }
                  onClick={() => {
                    const fake = { preventDefault() {} } as FormEvent
                    void handleSubmit(fake)
                  }}
                >
                  {saving ? 'Saqlanmoqda...' : 'Saqlash'}
                </Button>
              </Stack>
            </div>
          )}
        </aside>
      </div>

      <Dialog open={publishOpen} onClose={() => !actionLoading && setPublishOpen(false)}>
        <DialogTitle>Nashr qilish</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            Avval o‘zgarishlar saqlanadi, keyin so‘rovnoma nashr qilinadi. Hozir{' '}
            {answerableCount} ta javobli savol mavjud.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPublishOpen(false)} disabled={actionLoading}>
            Bekor qilish
          </Button>
          <Button variant="contained" onClick={() => void handlePublish()} disabled={actionLoading}>
            {actionLoading ? 'Nashr qilinmoqda...' : 'Nashr qilish'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={closeOpen} onClose={() => !actionLoading && setCloseOpen(false)}>
        <DialogTitle>So‘rovnomani yopish</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            Yopilgan so‘rovnomani tahrirlab bo‘lmaydi. Davom etasizmi?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCloseOpen(false)} disabled={actionLoading}>
            Bekor qilish
          </Button>
          <Button
            color="warning"
            variant="contained"
            onClick={() => void handleClose()}
            disabled={actionLoading}
          >
            {actionLoading ? 'Yopilmoqda...' : 'Yopish'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
