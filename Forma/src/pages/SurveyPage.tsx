import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Alert,
  Button,
  CircularProgress,
  CssBaseline,
  LinearProgress,
  Snackbar,
  TextField,
  ThemeProvider,
  Typography,
  createTheme,
} from '@mui/material'
import {
  ArrowBackRounded,
  ArrowForwardRounded,
  CheckCircleOutlineRounded,
  SendRounded,
} from '@mui/icons-material'
import { getForm, submitForm, uploadFormFile } from '../api/forms'
import { QuestionField } from '../components/QuestionField'
import type { RespondentField, SurveyForm, SurveyQuestion } from '../types/survey'
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

const DEFAULT_RESPONDENT_FIELDS: RespondentField[] = [
  { key: 'name', label: 'Ism familiya', type: 'text', required: true },
  { key: 'phone', label: 'Telefon raqam', type: 'phone', required: true },
]

type FormStep = {
  id: string
  title?: string
  description?: string
  kind: 'contact' | 'questions'
  questions: SurveyQuestion[]
}

function answerableQuestions(questions: SurveyQuestion[]) {
  return questions.filter((q) => q.type !== 'section')
}

function isEmptyAnswer(v: unknown) {
  if (v === undefined || v === null || v === '') return true
  if (Array.isArray(v) && v.length === 0) return true
  if (
    typeof v === 'object' &&
    !Array.isArray(v) &&
    Object.keys(v as object).length === 0
  ) {
    return true
  }
  return false
}

function validateRespondentValue(field: RespondentField, raw: string): string | null {
  const value = raw.trim()
  if (!value) {
    return field.required === false ? null : `${field.label} majburiy`
  }
  if (field.key === 'name' || field.type === 'text') {
    if (field.required !== false && value.length < 2) {
      return `${field.label} kamida 2 belgi bo‘lishi kerak`
    }
  }
  if (field.key === 'phone' || field.type === 'phone') {
    if (!isValidUzPhone(value)) {
      return `${field.label} to‘liq bo‘lishi kerak (90 123 45 67)`
    }
  }
  if (field.type === 'email' && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    return 'Email formati noto‘g‘ri'
  }
  return null
}

function buildSteps(questions: SurveyQuestion[]): FormStep[] {
  const hasSections = questions.some((q) => q.type === 'section')
  const contact: FormStep = {
    id: 'contact',
    title: 'Shaxsiy ma’lumot',
    description: 'Javob beruvchi ma’lumotlari',
    kind: 'contact',
    questions: [],
  }

  if (!hasSections) {
    return [
      {
        id: 'single',
        kind: 'questions',
        questions: answerableQuestions(questions),
      },
    ]
  }

  const steps: FormStep[] = [contact]
  let bucket: FormStep | null = null

  const flush = () => {
    if (bucket && bucket.questions.length > 0) steps.push(bucket)
    bucket = null
  }

  for (const q of questions) {
    if (q.type === 'section') {
      flush()
      bucket = {
        id: q.id,
        title: q.title || 'Bo‘lim',
        description: q.description,
        kind: 'questions',
        questions: [],
      }
      continue
    }
    if (!bucket) {
      bucket = {
        id: 'before-sections',
        title: 'Savollar',
        kind: 'questions',
        questions: [],
      }
    }
    bucket.questions.push(q)
  }
  flush()

  return steps
}

export function SurveyPage() {
  const { slug = '' } = useParams()
  const [form, setForm] = useState<SurveyForm | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [respondent, setRespondent] = useState<Record<string, string>>({})
  const [answers, setAnswers] = useState<Record<string, unknown>>({})
  const [fileNames, setFileNames] = useState<Record<string, string>>({})
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [submitError, setSubmitError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [uploadingId, setUploadingId] = useState<string | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [doneMessage, setDoneMessage] = useState<string | null>(null)
  const [stepIndex, setStepIndex] = useState(0)
  const [direction, setDirection] = useState(1)
  const [snack, setSnack] = useState<{ open: boolean; message: string }>({
    open: false,
    message: '',
  })

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setLoadError('')
    setDoneMessage(null)
    setStepIndex(0)

    getForm(slug)
      .then((data) => {
        if (cancelled) return
        setForm(data)
        setAnswers({})
        setFileNames({})
        const fields =
          data.respondentFields?.length
            ? data.respondentFields
            : DEFAULT_RESPONDENT_FIELDS
        const initial: Record<string, string> = {}
        for (const f of fields) initial[f.key] = ''
        setRespondent(initial)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setForm(null)
        setLoadError(err instanceof Error ? err.message : 'Forma topilmadi')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [slug])

  const questions = form?.questions ?? []
  const respondentFields =
    form?.respondentFields?.length
      ? form.respondentFields
      : DEFAULT_RESPONDENT_FIELDS
  const hasSections = questions.some((q) => q.type === 'section')
  const steps = useMemo(() => buildSteps(questions), [questions])
  const multiStep = hasSections
  const currentStep = steps[stepIndex] ?? steps[0]
  const isLastStep = stepIndex >= steps.length - 1
  const isSinglePage = !multiStep

  const progress = useMemo(() => {
    if (multiStep && steps.length > 0) {
      return Math.round(((stepIndex + 1) / steps.length) * 100)
    }
    const qs = answerableQuestions(questions)
    const total = qs.length + respondentFields.length
    let filled = 0
    for (const f of respondentFields) {
      if (!isEmptyAnswer(respondent[f.key]?.trim())) filled += 1
    }
    filled += qs.filter((q) => !isEmptyAnswer(answers[q.id])).length
    return total === 0 ? 0 : Math.round((filled / total) * 100)
  }, [
    answers,
    multiStep,
    questions,
    respondent,
    respondentFields,
    stepIndex,
    steps.length,
  ])

  const closed = form?.status === 'closed'

  const validateContact = () => {
    const errors: Record<string, string> = {}
    for (const field of respondentFields) {
      const err = validateRespondentValue(field, respondent[field.key] ?? '')
      if (err) errors[field.key] = err
    }
    setFieldErrors((prev) => {
      const next = { ...prev }
      for (const f of respondentFields) delete next[f.key]
      return { ...next, ...errors }
    })
    return Object.keys(errors).length === 0
  }

  const validateQuestions = (qs: SurveyQuestion[]) => {
    const errors: Record<string, string> = {}
    for (const q of qs) {
      if (!q.required) continue
      if (isEmptyAnswer(answers[q.id])) errors[q.id] = 'Bu maydon majburiy'
    }
    setFieldErrors((prev) => ({ ...prev, ...errors }))
    return Object.keys(errors).length === 0
  }

  const validateAll = () => {
    const errors: Record<string, string> = {}
    for (const field of respondentFields) {
      const err = validateRespondentValue(field, respondent[field.key] ?? '')
      if (err) errors[field.key] = err
    }
    for (const q of answerableQuestions(questions)) {
      if (!q.required) continue
      if (isEmptyAnswer(answers[q.id])) errors[q.id] = 'Bu maydon majburiy'
    }
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const contactInvalid = () =>
    respondentFields.some(
      (f) => validateRespondentValue(f, respondent[f.key] ?? '') !== null,
    )

  const goNext = () => {
    if (!currentStep) return
    setSubmitError('')

    if (currentStep.kind === 'contact') {
      if (!validateContact()) return
    } else if (!validateQuestions(currentStep.questions)) {
      return
    }

    if (!isLastStep) {
      setDirection(1)
      setStepIndex((i) => i + 1)
    }
  }

  const goBack = () => {
    if (stepIndex === 0) return
    setDirection(-1)
    setStepIndex((i) => i - 1)
  }

  const handleSubmit = async (e?: { preventDefault: () => void }) => {
    e?.preventDefault()
    if (!form || closed) return
    setSubmitError('')

    if (multiStep) {
      if (currentStep?.kind === 'contact' && !validateContact()) return
      if (
        currentStep?.kind === 'questions' &&
        !validateQuestions(currentStep.questions)
      ) {
        return
      }
      if (!isLastStep) {
        goNext()
        return
      }
      if (!validateAll()) {
        if (contactInvalid()) {
          setDirection(-1)
          setStepIndex(0)
        }
        return
      }
    } else if (!validateAll()) {
      return
    }

    setSubmitting(true)
    try {
      const result = await submitForm(slug, {
        name: (respondent.name ?? '').trim(),
        phone: (respondent.phone ?? '').trim(),
        answers,
      })
      setDoneMessage(
        result.confirmationMessage ||
          form.settings?.confirmationMessage ||
          'Rahmat! Javobingiz qabul qilindi.',
      )
      setSnack({ open: true, message: 'So‘rovnoma muvaffaqiyatli topshirildi' })
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : 'Yuborishda xatolik')
    } finally {
      setSubmitting(false)
    }
  }

  const handleUpload = async (questionId: string, file: File) => {
    setUploadingId(questionId)
    setUploadProgress(0)
    setFieldErrors((prev) => {
      const next = { ...prev }
      delete next[questionId]
      return next
    })
    try {
      const path = await uploadFormFile(slug, questionId, file, setUploadProgress)
      setAnswers((prev) => ({ ...prev, [questionId]: path }))
      setFileNames((prev) => ({ ...prev, [questionId]: file.name }))
      setSnack({ open: true, message: `${file.name} yuklandi` })
    } catch (err: unknown) {
      setFieldErrors((prev) => ({
        ...prev,
        [questionId]:
          err instanceof Error ? err.message : 'Fayl yuklashda xatolik',
      }))
    } finally {
      setUploadingId(null)
      setUploadProgress(0)
    }
  }

  const inputTypeFor = (field: RespondentField) => {
    if (field.type === 'phone' || field.key === 'phone') return 'tel'
    if (field.type === 'email' || field.key === 'email') return 'email'
    return 'text'
  }

  const contactFields = (
    <div
      className={`grid gap-4 ${
        respondentFields.length > 1 ? 'sm:grid-cols-2' : 'grid-cols-1'
      }`}
    >
      {respondentFields.map((field) => {
        const isPhone = field.type === 'phone' || field.key === 'phone'
        return (
        <div key={field.key} className="space-y-1.5">
          <label className="text-sm font-semibold text-slate-700">
            {field.label}
            {field.required !== false && (
              <span className="text-teal-600"> *</span>
            )}
          </label>
          {isPhone ? (
            <PhoneField
              label={undefined}
              value={respondent[field.key] ?? ''}
              onChange={(phone) => {
                setRespondent((prev) => ({ ...prev, [field.key]: phone }))
                setFieldErrors((prev) => {
                  const next = { ...prev }
                  delete next[field.key]
                  return next
                })
              }}
              disabled={closed || submitting}
              error={Boolean(fieldErrors[field.key])}
              helperText={
                fieldErrors[field.key] ||
                field.description ||
                'Masalan: 90 123 45 67'
              }
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '14px',
                  backgroundColor: '#fff',
                },
              }}
            />
          ) : (
          <TextField
            fullWidth
            type={inputTypeFor(field)}
            placeholder={field.placeholder || field.label}
            value={respondent[field.key] ?? ''}
            onChange={(e) => {
              const value = e.target.value
              setRespondent((prev) => ({ ...prev, [field.key]: value }))
              setFieldErrors((prev) => {
                const next = { ...prev }
                delete next[field.key]
                return next
              })
            }}
            disabled={closed || submitting}
            error={Boolean(fieldErrors[field.key])}
            helperText={fieldErrors[field.key] || field.description}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: '14px',
                backgroundColor: '#fff',
              },
            }}
          />
          )}
        </div>
        )
      })}
    </div>
  )

  const renderQuestions = (qs: SurveyQuestion[]) =>
    qs.map((q) => (
      <QuestionField
        key={q.id}
        question={q}
        value={answers[q.id]}
        fileName={fileNames[q.id]}
        error={fieldErrors[q.id]}
        disabled={closed || submitting}
        uploading={uploadingId === q.id}
        uploadProgress={uploadingId === q.id ? uploadProgress : 0}
        onChange={(value) => {
          setAnswers((prev) => ({ ...prev, [q.id]: value }))
          setFieldErrors((prev) => {
            const next = { ...prev }
            delete next[q.id]
            return next
          })
        }}
        onUpload={(file) => handleUpload(q.id, file)}
        onClearUpload={() => {
          setFileNames((prev) => {
            const next = { ...prev }
            delete next[q.id]
            return next
          })
        }}
      />
    ))

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <div className="min-h-svh px-4 py-8 sm:px-6 sm:py-12">
        <div className="mx-auto w-full max-w-2xl">
          {loading && (
            <div className="flex flex-col items-center gap-4 py-24 text-slate-500">
              <CircularProgress color="primary" />
              <p>So‘rovnoma yuklanmoqda...</p>
            </div>
          )}

          {!loading && loadError && (
            <Alert severity="error" className="!rounded-2xl">
              {loadError}
            </Alert>
          )}

          <AnimatePresence mode="wait">
            {!loading && form && doneMessage && (
              <motion.div
                key="done"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-3xl border border-teal-200 bg-white/90 p-8 text-center shadow-lg sm:p-12"
              >
                <CheckCircleOutlineRounded color="primary" sx={{ fontSize: 64 }} />
                <Typography variant="h5" sx={{ fontWeight: 700, mt: 2 }}>
                  Topshirildi
                </Typography>
                <Typography color="text.secondary" className="!mt-3">
                  {doneMessage}
                </Typography>
              </motion.div>
            )}

            {!loading && form && !doneMessage && (
              <motion.form
                key="form"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                onSubmit={handleSubmit}
                className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white/95 shadow-lg backdrop-blur"
              >
                <div className="bg-gradient-to-br from-teal-600 via-teal-700 to-sky-800 px-6 py-8 text-white sm:px-8">
                  <Typography variant="h4" sx={{ fontWeight: 700 }}>
                    {form.title}
                  </Typography>
                  {form.description && (
                    <p className="mt-2 text-teal-50/95">{form.description}</p>
                  )}
                  {multiStep && (
                    <p className="mt-3 text-sm text-teal-100/90">
                      Etap {stepIndex + 1} / {steps.length}
                      {currentStep?.title ? ` — ${currentStep.title}` : ''}
                    </p>
                  )}
                  {closed && (
                    <Alert severity="warning" className="!mt-4 !rounded-xl">
                      Bu so‘rovnoma yopilgan — javob qabul qilinmaydi.
                    </Alert>
                  )}
                </div>

                {form.settings?.showProgressBar !== false && (
                  <div className="px-6 pt-4 sm:px-8">
                    <div className="mb-1 flex justify-between text-xs text-slate-500">
                      <span>Jarayon</span>
                      <span>{progress}%</span>
                    </div>
                    <LinearProgress
                      variant="determinate"
                      value={progress}
                      sx={{ height: 8, borderRadius: 999 }}
                    />
                  </div>
                )}

                <div className="relative min-h-[280px] overflow-hidden px-6 py-6 sm:px-8 sm:py-8">
                  <AnimatePresence mode="wait" custom={direction}>
                    <motion.div
                      key={isSinglePage ? 'single' : currentStep?.id || stepIndex}
                      custom={direction}
                      initial={{ opacity: 0, x: direction > 0 ? 40 : -40 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: direction > 0 ? -40 : 40 }}
                      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                      className="flex flex-col gap-6"
                    >
                      {isSinglePage ? (
                        <>
                          {contactFields}
                          {renderQuestions(answerableQuestions(questions))}
                        </>
                      ) : currentStep?.kind === 'contact' ? (
                        <>
                          <div>
                            <h2 className="text-lg font-bold text-slate-800">
                              {currentStep.title}
                            </h2>
                            {currentStep.description && (
                              <p className="mt-1 text-sm text-slate-500">
                                {currentStep.description}
                              </p>
                            )}
                          </div>
                          {contactFields}
                        </>
                      ) : (
                        <>
                          {(currentStep?.title || currentStep?.description) && (
                            <div>
                              {currentStep.title && (
                                <h2 className="text-lg font-bold text-slate-800">
                                  {currentStep.title}
                                </h2>
                              )}
                              {currentStep.description && (
                                <p className="mt-1 text-sm text-slate-500">
                                  {currentStep.description}
                                </p>
                              )}
                            </div>
                          )}
                          {renderQuestions(currentStep?.questions ?? [])}
                        </>
                      )}
                    </motion.div>
                  </AnimatePresence>

                  {submitError && (
                    <Alert severity="error" className="!mt-6 !rounded-xl">
                      {submitError}
                    </Alert>
                  )}

                  <div className="mt-8 flex flex-wrap items-center gap-3">
                    {multiStep && stepIndex > 0 && (
                      <Button
                        type="button"
                        variant="outlined"
                        startIcon={<ArrowBackRounded />}
                        onClick={goBack}
                        disabled={submitting || Boolean(uploadingId)}
                      >
                        Orqaga
                      </Button>
                    )}

                    {multiStep && !isLastStep ? (
                      <Button
                        type="button"
                        variant="contained"
                        endIcon={<ArrowForwardRounded />}
                        onClick={goNext}
                        disabled={closed || submitting || Boolean(uploadingId)}
                      >
                        Keyingi
                      </Button>
                    ) : (
                      <Button
                        type="submit"
                        variant="contained"
                        size="large"
                        disabled={closed || submitting || Boolean(uploadingId)}
                        startIcon={
                          submitting ? (
                            <CircularProgress size={18} color="inherit" />
                          ) : (
                            <SendRounded />
                          )
                        }
                      >
                        {submitting ? 'Yuborilmoqda...' : 'Yuborish'}
                      </Button>
                    )}
                  </div>
                </div>
              </motion.form>
            )}
          </AnimatePresence>
        </div>
      </div>

      <Snackbar
        open={snack.open}
        autoHideDuration={2800}
        onClose={() => setSnack((s) => ({ ...s, open: false }))}
        message={snack.message}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      />
    </ThemeProvider>
  )
}
