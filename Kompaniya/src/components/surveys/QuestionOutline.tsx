import { Chip, IconButton, Typography } from '@mui/material'
import {
  ArrowDownwardRounded,
  ArrowUpwardRounded,
  DeleteOutlineRounded,
} from '@mui/icons-material'
import type { Question } from '../../api/types'
import { QUESTION_TYPE_LABELS } from '../../lib/survey'

export function QuestionOutline({
  questions,
  activeIndex,
  disabled,
  onSelect,
  onMove,
  onDelete,
}: {
  questions: Question[]
  activeIndex: number
  disabled?: boolean
  onSelect: (index: number) => void
  onMove: (index: number, dir: -1 | 1) => void
  onDelete: (index: number) => void
}) {
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="shrink-0 border-b border-slate-100 bg-slate-50/80 px-4 py-3">
        <Typography className="!text-sm !font-semibold !text-slate-900">
          Savollar ro‘yxati
        </Typography>
        <p className="text-xs text-slate-500">{questions.length} ta element</p>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {questions.map((q, i) => {
          const isSection = q.type === 'section'
          const isActive = i === activeIndex
          const label = q.title?.trim() || QUESTION_TYPE_LABELS[q.type]

          return (
            <div
              key={`${q.id}-${i}`}
              className={`group mb-1 flex items-stretch gap-1 rounded-xl transition ${
                isActive ? 'bg-teal-50 ring-1 ring-teal-200' : 'hover:bg-slate-50'
              }`}
            >
              <button
                type="button"
                onClick={() => onSelect(i)}
                className="flex min-w-0 flex-1 items-start gap-2 px-2 py-2.5 text-left"
              >
                <span
                  className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-md text-xs font-bold ${
                    isSection
                      ? 'bg-violet-100 text-violet-700'
                      : isActive
                        ? 'bg-teal-600 text-white'
                        : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-800">{label}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-1">
                    <Chip
                      size="small"
                      label={QUESTION_TYPE_LABELS[q.type]}
                      sx={{
                        height: 20,
                        fontSize: 10,
                        fontWeight: 600,
                        bgcolor: isSection ? 'rgba(139,92,246,0.12)' : 'rgba(148,163,184,0.15)',
                        color: isSection ? '#6d28d9' : '#475569',
                      }}
                    />
                    {q.required && !isSection && (
                      <span className="text-[10px] font-medium text-red-500">Majburiy</span>
                    )}
                    {q.options?.some((o) => o.isCorrect) && (
                      <span className="text-[10px] font-medium text-emerald-600">To‘g‘ri ✓</span>
                    )}
                  </div>
                </div>
              </button>
              {!disabled && (
                <div className="flex shrink-0 flex-col justify-center gap-0.5 pr-1 opacity-0 transition group-hover:opacity-100">
                  <IconButton size="small" onClick={() => onMove(i, -1)} disabled={i === 0}>
                    <ArrowUpwardRounded sx={{ fontSize: 16 }} />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => onMove(i, 1)}
                    disabled={i === questions.length - 1}
                  >
                    <ArrowDownwardRounded sx={{ fontSize: 16 }} />
                  </IconButton>
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => onDelete(i)}
                    disabled={questions.length <= 1}
                  >
                    <DeleteOutlineRounded sx={{ fontSize: 16 }} />
                  </IconButton>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
