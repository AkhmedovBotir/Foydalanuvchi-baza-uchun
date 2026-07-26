import { useState, type ReactNode } from 'react'
import { Box, IconButton, Typography } from '@mui/material'
import {
  ArrowDownwardRounded,
  ArrowUpwardRounded,
  DeleteOutlineRounded,
  ExpandMoreRounded,
} from '@mui/icons-material'

export function EditorSection({
  title,
  description,
  defaultOpen = true,
  children,
}: {
  title: string
  description?: string
  defaultOpen?: boolean
  children: ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50/40">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left transition hover:bg-slate-50"
      >
        <div>
          <p className="text-sm font-semibold text-slate-800">{title}</p>
          {description && <p className="text-xs text-slate-500">{description}</p>}
        </div>
        <ExpandMoreRounded
          className={`shrink-0 text-slate-400 transition ${open ? 'rotate-180' : ''}`}
          fontSize="small"
        />
      </button>
      {open && <div className="border-t border-slate-200 bg-white px-4 py-4">{children}</div>}
    </div>
  )
}

export function QuestionEditorShell({
  index,
  total,
  isSection,
  typeLabel,
  required,
  disabled,
  onMoveUp,
  onMoveDown,
  onDelete,
  header,
  children,
}: {
  index: number
  total: number
  isSection: boolean
  typeLabel: string
  required?: boolean
  disabled?: boolean
  onMoveUp: () => void
  onMoveDown: () => void
  onDelete: () => void
  header: ReactNode
  children: ReactNode
}) {
  return (
    <Box
      className={`overflow-hidden rounded-2xl border shadow-sm ${
        isSection ? 'border-violet-200 bg-violet-50/20' : 'border-slate-200 bg-white'
      }`}
    >
      <div
        className={`flex items-center gap-3 border-b px-4 py-3 ${
          isSection ? 'border-violet-100 bg-violet-50/60' : 'border-slate-100 bg-slate-50/80'
        }`}
      >
        <span
          className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg text-sm font-bold text-white ${
            isSection ? 'bg-violet-600' : 'bg-teal-600'
          }`}
        >
          {index + 1}
        </span>
        <div className="min-w-0 flex-1">
          <Typography variant="caption" className="!font-semibold !uppercase !tracking-wide !text-slate-500">
            {typeLabel}
          </Typography>
          {required && !isSection && (
            <p className="text-[10px] font-medium text-red-500">Majburiy savol</p>
          )}
        </div>
        {!disabled && (
          <div className="flex items-center gap-0.5">
            <IconButton size="small" onClick={onMoveUp} disabled={index === 0}>
              <ArrowUpwardRounded fontSize="small" />
            </IconButton>
            <IconButton size="small" onClick={onMoveDown} disabled={index === total - 1}>
              <ArrowDownwardRounded fontSize="small" />
            </IconButton>
            <IconButton size="small" color="error" onClick={onDelete}>
              <DeleteOutlineRounded fontSize="small" />
            </IconButton>
          </div>
        )}
      </div>
      <div className="space-y-5 p-5">
        {header}
        {children}
      </div>
    </Box>
  )
}
