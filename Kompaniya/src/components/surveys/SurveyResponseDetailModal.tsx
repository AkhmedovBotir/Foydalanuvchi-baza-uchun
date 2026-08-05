import { useState } from 'react'
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogContent,
  IconButton,
  Typography,
} from '@mui/material'
import {
  AudioFileRounded,
  CloseRounded,
  DeleteOutlineRounded,
  DescriptionRounded,
  InsertDriveFileRounded,
  OpenInNewRounded,
  PersonRounded,
  PhoneRounded,
  PictureAsPdfRounded,
  VideocamRounded,
} from '@mui/icons-material'
import type { Question, QuestionType, SurveyResponseDetail } from '../../api/types'
import { apiUrl } from '../../api/config'
import { QUESTION_TYPE_LABELS, STATUS_META, typeIsFile } from '../../lib/survey'

const headingFont = { fontFamily: "'Outfit', sans-serif" }

type FileRef = {
  url: string
  label: string
  kind: 'image' | 'video' | 'audio' | 'pdf' | 'file'
}

function formatDate(value?: string | null) {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleString('uz-UZ', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** Backend static files va API resource yo‘llari */
function resolveFileUrl(raw: string): string {
  const value = raw.trim()
  if (!value) return ''
  if (value.startsWith('blob:') || value.startsWith('data:')) return value
  if (/^https?:\/\//i.test(value)) return value
  return apiUrl(value)
}

function extOf(url: string): string {
  try {
    const path = url.split('?')[0] ?? url
    const name = path.split('/').pop() ?? ''
    const dot = name.lastIndexOf('.')
    return dot >= 0 ? name.slice(dot + 1).toLowerCase() : ''
  } catch {
    return ''
  }
}

function kindFromExt(ext: string): FileRef['kind'] {
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg', 'avif'].includes(ext)) return 'image'
  if (['mp4', 'webm', 'ogg', 'mov', 'm4v'].includes(ext)) return 'video'
  if (['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac'].includes(ext)) return 'audio'
  if (ext === 'pdf') return 'pdf'
  return 'file'
}

function kindFromQuestionType(type?: QuestionType): FileRef['kind'] | null {
  if (!type) return null
  if (type === 'file_image') return 'image'
  if (type === 'file_video') return 'video'
  if (type === 'file_audio') return 'audio'
  if (type === 'file_pdf') return 'pdf'
  if (typeIsFile(type)) return 'file'
  return null
}

function fileLabel(url: string): string {
  try {
    const path = decodeURIComponent(url.split('?')[0] ?? url)
    return path.split('/').pop() || 'Fayl'
  } catch {
    return 'Fayl'
  }
}

function extractFileRefs(value: unknown, questionType?: QuestionType): FileRef[] {
  const preferred = kindFromQuestionType(questionType)

  const fromOne = (item: unknown): FileRef | null => {
    if (item == null || item === '') return null

    if (typeof item === 'string') {
      const url = resolveFileUrl(item)
      if (!url) return null
      return {
        url,
        label: fileLabel(url),
        kind: preferred && preferred !== 'file' ? preferred : kindFromExt(extOf(url)),
      }
    }

    if (typeof item === 'object' && !Array.isArray(item)) {
      const obj = item as Record<string, unknown>
      const raw =
        (typeof obj.url === 'string' && obj.url) ||
        (typeof obj.path === 'string' && obj.path) ||
        (typeof obj.src === 'string' && obj.src) ||
        (typeof obj.file === 'string' && obj.file) ||
        ''
      if (!raw) return null
      const url = resolveFileUrl(raw)
      const name =
        (typeof obj.name === 'string' && obj.name) ||
        (typeof obj.filename === 'string' && obj.filename) ||
        (typeof obj.originalName === 'string' && obj.originalName) ||
        fileLabel(url)
      return {
        url,
        label: name,
        kind: preferred && preferred !== 'file' ? preferred : kindFromExt(extOf(url)),
      }
    }

    return null
  }

  if (Array.isArray(value)) {
    return value.map(fromOne).filter((x): x is FileRef => Boolean(x))
  }

  const one = fromOne(value)
  return one ? [one] : []
}

function looksLikeFileAnswer(value: unknown, question?: Question): boolean {
  if (question && typeIsFile(question.type)) return true

  const check = (item: unknown): boolean => {
    if (typeof item === 'string') {
      const v = item.trim()
      if (!v) return false
      if (/^https?:\/\//i.test(v)) {
        const ext = extOf(v)
        return Boolean(ext) || v.includes('/uploads/') || v.includes('/files/')
      }
      return (
        v.startsWith('/') ||
        v.startsWith('uploads/') ||
        v.startsWith('files/') ||
        v.includes('/uploads/')
      )
    }
    if (item && typeof item === 'object' && !Array.isArray(item)) {
      const o = item as Record<string, unknown>
      return Boolean(o.url || o.path || o.src || o.file)
    }
    return false
  }

  if (Array.isArray(value)) return value.some(check)
  return check(value)
}

function renderPlainAnswer(question: Question | undefined, value: unknown): string {
  if (value == null || value === '') return '—'

  const mapOption = (id: unknown) => {
    const opt = question?.options?.find((o) => o.id === id)
    return opt ? opt.label : String(id)
  }

  if (Array.isArray(value)) {
    return value.map((v) => mapOption(v)).join(', ')
  }

  if (typeof value === 'object') {
    return JSON.stringify(value)
  }

  if (question?.options?.length) {
    return mapOption(value)
  }

  return String(value)
}

function FileKindIcon({ kind }: { kind: FileRef['kind'] }) {
  switch (kind) {
    case 'video':
      return <VideocamRounded fontSize="small" />
    case 'audio':
      return <AudioFileRounded fontSize="small" />
    case 'pdf':
      return <PictureAsPdfRounded fontSize="small" />
    case 'image':
      return <InsertDriveFileRounded fontSize="small" />
    default:
      return <DescriptionRounded fontSize="small" />
  }
}

function FilePreview({ file }: { file: FileRef }) {
  const [broken, setBroken] = useState(false)

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
      <div className="flex items-center justify-between gap-2 border-b border-slate-200/80 bg-white px-3 py-2">
        <div className="flex min-w-0 items-center gap-2 text-slate-600">
          <FileKindIcon kind={file.kind} />
          <span className="truncate text-xs font-medium text-slate-700">{file.label}</span>
        </div>
        <Button
          size="small"
          component="a"
          href={file.url}
          target="_blank"
          rel="noopener noreferrer"
          startIcon={<OpenInNewRounded sx={{ fontSize: 14 }} />}
          sx={{ flexShrink: 0, textTransform: 'none' }}
        >
          Ochish
        </Button>
      </div>

      <div className="p-3">
        {file.kind === 'image' && !broken && (
          <a href={file.url} target="_blank" rel="noopener noreferrer" className="block">
            <img
              src={file.url}
              alt={file.label}
              className="mx-auto max-h-80 w-auto max-w-full rounded-lg object-contain"
              onError={() => setBroken(true)}
            />
          </a>
        )}

        {file.kind === 'video' && !broken && (
          <video
            src={file.url}
            controls
            className="mx-auto max-h-80 w-full rounded-lg bg-black"
            onError={() => setBroken(true)}
          />
        )}

        {file.kind === 'audio' && !broken && (
          <audio
            src={file.url}
            controls
            className="w-full"
            onError={() => setBroken(true)}
          />
        )}

        {file.kind === 'pdf' && !broken && (
          <iframe
            title={file.label}
            src={file.url}
            className="h-96 w-full rounded-lg border border-slate-200 bg-white"
            onError={() => setBroken(true)}
          />
        )}

        {(file.kind === 'file' || broken) && (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-slate-200/70 text-slate-600">
              <FileKindIcon kind={file.kind} />
            </div>
            <p className="text-sm text-slate-600">
              {broken ? 'Oldindan ko‘rish mumkin emas' : 'Bu fayl turini shu yerda ochib bo‘lmaydi'}
            </p>
            <Button
              variant="outlined"
              size="small"
              component="a"
              href={file.url}
              target="_blank"
              rel="noopener noreferrer"
              startIcon={<OpenInNewRounded />}
            >
              Faylni ochish
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

function AnswerValue({
  question,
  value,
}: {
  question?: Question
  value: unknown
}) {
  const hasAnswer = value != null && value !== ''
  if (!hasAnswer) {
    return <p className="text-sm italic text-slate-400">Javob berilmagan</p>
  }

  if (looksLikeFileAnswer(value, question)) {
    const files = extractFileRefs(value, question?.type)
    if (files.length) {
      return (
        <div className="mt-2 space-y-3">
          {files.map((file, i) => (
            <FilePreview key={`${file.url}-${i}`} file={file} />
          ))}
        </div>
      )
    }
  }

  return (
    <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-slate-800">
      {renderPlainAnswer(question, value)}
    </p>
  )
}

export function SurveyResponseDetailModal({
  open,
  loading,
  detail,
  fallbackTitle,
  onClose,
  onDelete,
}: {
  open: boolean
  loading?: boolean
  detail: SurveyResponseDetail | null
  fallbackTitle?: string
  onClose: () => void
  onDelete?: (id: string) => void
}) {
  const status = detail?.surveyStatus ? STATUS_META[detail.surveyStatus] : null
  const answeredCount = (detail?.questions ?? []).filter(
    (q) => q.type !== 'section' && detail?.answers?.[q.id] != null && detail.answers[q.id] !== '',
  ).length
  const questionCount = (detail?.questions ?? []).filter((q) => q.type !== 'section').length

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="md"
      scroll="paper"
      slotProps={{
        paper: {
          sx: {
            borderRadius: '1.25rem',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            maxHeight: '92vh',
          },
        },
      }}
    >
      <div className="relative shrink-0 overflow-hidden bg-slate-950 px-5 py-5 text-white sm:px-6">
        <div className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-teal-500/20 blur-2xl" />
        <div className="relative flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Javob tafsiloti
            </p>
            <Typography
              sx={{
                ...headingFont,
                fontWeight: 800,
                fontSize: { xs: '1.15rem', sm: '1.35rem' },
                mt: 0.5,
              }}
            >
              {detail?.surveyTitle || fallbackTitle || 'So‘rovnoma'}
            </Typography>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {status && (
                <Chip
                  size="small"
                  label={status.label}
                  sx={{
                    fontWeight: 600,
                    bgcolor: 'rgba(255,255,255,0.12)',
                    color: 'white',
                  }}
                />
              )}
              <span className="text-sm text-slate-300">{formatDate(detail?.createdAt)}</span>
              {!loading && detail?.questions?.length ? (
                <span className="text-sm text-slate-400">
                  · {answeredCount}/{questionCount} javob
                </span>
              ) : null}
            </div>
          </div>
          <IconButton
            onClick={onClose}
            sx={{
              color: 'white',
              bgcolor: 'rgba(255,255,255,0.08)',
              '&:hover': { bgcolor: 'rgba(255,255,255,0.16)' },
            }}
            aria-label="Yopish"
          >
            <CloseRounded />
          </IconButton>
        </div>
      </div>

      <DialogContent sx={{ p: 0, bgcolor: '#f8fafc', flex: '1 1 auto', minHeight: 0, overflowY: 'auto' }}>
        {loading && (
          <Box className="grid place-items-center py-20">
            <CircularProgress />
          </Box>
        )}

        {detail && !loading && (
          <div className="space-y-4 p-4 sm:p-5">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-teal-50 text-teal-700">
                  <PersonRounded fontSize="small" />
                </span>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    Ism familiya
                  </p>
                  <p className="mt-0.5 truncate text-sm font-semibold text-slate-900">
                    {detail.name || '—'}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-cyan-50 text-cyan-700">
                  <PhoneRounded fontSize="small" />
                </span>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    Telefon
                  </p>
                  <p className="mt-0.5 truncate text-sm font-semibold text-slate-900">
                    {detail.phone || '—'}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {(detail.questions ?? []).map((question, index) => {
                if (question.type === 'section') {
                  return (
                    <div
                      key={question.id}
                      className="border-b border-violet-200/80 pb-2 pt-3 text-sm font-bold text-violet-800"
                    >
                      {question.title || 'Bo‘lim'}
                    </div>
                  )
                }

                const answer = detail.answers?.[question.id]
                const answerableIndex =
                  (detail.questions ?? [])
                    .slice(0, index + 1)
                    .filter((q) => q.type !== 'section').length

                return (
                  <div
                    key={question.id}
                    className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                  >
                    <div className="flex items-start gap-3 border-b border-slate-100 bg-slate-50/80 px-4 py-3">
                      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-teal-600 text-xs font-bold text-white">
                        {answerableIndex}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-slate-900">
                          {question.title || question.id}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                          <Chip
                            size="small"
                            label={QUESTION_TYPE_LABELS[question.type]}
                            sx={{
                              height: 20,
                              fontSize: 10,
                              fontWeight: 600,
                              bgcolor: 'rgba(13,148,136,0.1)',
                              color: '#0f766e',
                            }}
                          />
                          {question.required && (
                            <Chip
                              size="small"
                              label="Majburiy"
                              sx={{ height: 20, fontSize: 10, fontWeight: 600 }}
                            />
                          )}
                        </div>
                        {question.description && (
                          <p className="mt-1.5 text-xs text-slate-500">{question.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="px-4 py-3">
                      <AnswerValue question={question} value={answer} />
                    </div>
                  </div>
                )
              })}

              {(!detail.questions || detail.questions.length === 0) &&
                Object.entries(detail.answers ?? {}).map(([qid, value], i) => (
                  <div
                    key={qid}
                    className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                  >
                    <div className="border-b border-slate-100 bg-slate-50/80 px-4 py-3">
                      <p className="text-sm font-semibold text-slate-900">
                        {i + 1}. {qid}
                      </p>
                    </div>
                    <div className="px-4 py-3">
                      <AnswerValue value={value} />
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}
      </DialogContent>

      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-slate-200 bg-white px-4 py-3 sm:px-5">
        {detail && onDelete ? (
          <Button
            color="error"
            variant="outlined"
            startIcon={<DeleteOutlineRounded />}
            onClick={() => onDelete(detail.id)}
          >
            O‘chirish
          </Button>
        ) : (
          <span />
        )}
        <Button variant="contained" onClick={onClose} disabled={loading}>
          Yopish
        </Button>
      </div>
    </Dialog>
  )
}
