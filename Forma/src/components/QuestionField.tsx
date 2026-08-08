import type { ReactNode } from 'react'
import {
  CalendarMonthRounded,
  EmailRounded,
  LinkRounded,
  NumbersRounded,
  ScheduleRounded,
} from '@mui/icons-material'
import {
  Checkbox,
  InputAdornment,
  MenuItem,
  Radio,
  Rating,
  Slider,
  TextField,
} from '@mui/material'
import type { SurveyQuestion } from '../types/survey'
import { FileUploadField } from './FileUploadField'
import { PhoneField } from '../ui/PhoneField'

type Props = {
  question: SurveyQuestion
  value: unknown
  error?: string
  disabled?: boolean
  onChange: (value: unknown) => void
  onUpload?: (file: File) => Promise<void>
  onClearUpload?: () => void
  uploading?: boolean
  uploadProgress?: number
  fileName?: string
}

function fieldShell(
  title: string | undefined,
  required: boolean | undefined,
  description: string | undefined,
  error: string | undefined,
  children: ReactNode,
) {
  return (
    <div className="space-y-2">
      {title && (
        <label className="block text-sm font-semibold text-slate-700">
          {title}
          {required ? <span className="text-teal-600"> *</span> : null}
        </label>
      )}
      {description && !error && (
        <p className="text-xs text-slate-500">{description}</p>
      )}
      {children}
      {error && <p className="text-xs font-medium text-red-600">{error}</p>}
    </div>
  )
}

function isFileType(type: string) {
  return type === 'file' || type.startsWith('file_')
}

const pillSx = {
  '& .MuiOutlinedInput-root': {
    borderRadius: '999px',
    backgroundColor: '#fff',
  },
}

const roundedSx = {
  '& .MuiOutlinedInput-root': {
    borderRadius: '14px',
    backgroundColor: '#fff',
  },
}

export function QuestionField({
  question,
  value,
  error,
  disabled,
  onChange,
  onUpload,
  onClearUpload,
  uploading,
  uploadProgress,
  fileName,
}: Props) {
  const { type, title, description, required, options, config, validation } = question

  if (type === 'section') return null

  if (isFileType(type)) {
    return (
      <FileUploadField
        type={type}
        label={`${title ?? 'Fayl'}${required ? ' *' : ''}`}
        description={description}
        accept={config?.accept}
        maxSizeMb={config?.maxSizeMb}
        value={typeof value === 'string' ? value : undefined}
        fileName={fileName}
        error={error}
        disabled={disabled}
        uploading={uploading}
        progress={uploadProgress}
        onUpload={async (file) => {
          if (onUpload) await onUpload(file)
        }}
        onClear={() => {
          onChange('')
          onClearUpload?.()
        }}
      />
    )
  }

  if (type === 'long_text') {
    return fieldShell(
      title,
      required,
      description,
      error,
      <TextField
        fullWidth
        multiline
        minRows={4}
        placeholder="Javobingizni yozing..."
        value={(value as string) ?? ''}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        error={Boolean(error)}
        sx={roundedSx}
        slotProps={{
          htmlInput: {
            maxLength: validation?.maxLength,
            minLength: validation?.minLength,
          },
        }}
      />,
    )
  }

  if (
    type === 'short_text' ||
    type === 'email' ||
    type === 'phone' ||
    type === 'url' ||
    type === 'number'
  ) {
    if (type === 'phone') {
      return fieldShell(
        title,
        required,
        description,
        error,
        <PhoneField
          label={undefined}
          value={String((value as string | number) ?? '')}
          onChange={(v) => onChange(v)}
          disabled={disabled}
          error={Boolean(error)}
          placeholder="90 123 45 67"
          sx={pillSx}
        />,
      )
    }

    const placeholders: Record<string, string> = {
      short_text: 'Javob yozing',
      email: 'Email yozing',
      url: 'Havola bering',
      number: 'Raqam yozing',
    }
    const icons = {
      email: <EmailRounded fontSize="small" />,
      url: <LinkRounded fontSize="small" />,
      number: <NumbersRounded fontSize="small" />,
    } as const

    const adornment =
      type in icons ? (
        <InputAdornment position="start">
          {icons[type as keyof typeof icons]}
        </InputAdornment>
      ) : undefined

    return fieldShell(
      title,
      required,
      description,
      error,
      <TextField
        fullWidth
        type={type === 'short_text' ? 'text' : type}
        placeholder={placeholders[type]}
        value={(value as string | number) ?? ''}
        onChange={(e) => {
          if (type === 'number') {
            const n = Number(e.target.value)
            onChange(
              Number.isFinite(n) && e.target.value !== '' ? n : e.target.value,
            )
            return
          }
          onChange(e.target.value)
        }}
        disabled={disabled}
        error={Boolean(error)}
        sx={type === 'short_text' ? roundedSx : pillSx}
        slotProps={{
          input: adornment ? { startAdornment: adornment } : undefined,
          htmlInput: {
            min: validation?.min,
            max: validation?.max,
            maxLength: validation?.maxLength,
            minLength: validation?.minLength,
            pattern: validation?.pattern,
          },
        }}
      />,
    )
  }

  if (type === 'date' || type === 'time' || type === 'datetime') {
    const inputType =
      type === 'datetime' ? 'datetime-local' : type === 'date' ? 'date' : 'time'
    const icon =
      type === 'time' ? (
        <ScheduleRounded fontSize="small" />
      ) : (
        <CalendarMonthRounded fontSize="small" />
      )

    return fieldShell(
      title,
      required,
      description,
      error,
      <TextField
        fullWidth
        type={inputType}
        value={(value as string) ?? ''}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        error={Boolean(error)}
        sx={roundedSx}
        slotProps={{
          inputLabel: { shrink: true },
          input: {
            startAdornment: (
              <InputAdornment position="start">{icon}</InputAdornment>
            ),
          },
        }}
      />,
    )
  }

  if (type === 'dropdown') {
    return fieldShell(
      title,
      required,
      description,
      error,
      <TextField
        select
        fullWidth
        value={(value as string) ?? ''}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        error={Boolean(error)}
        sx={roundedSx}
        slotProps={{ select: { displayEmpty: true } }}
      >
        <MenuItem value="">
          <em className="text-slate-400">Tanlang</em>
        </MenuItem>
        {(options ?? []).map((opt) => (
          <MenuItem key={opt.id} value={opt.id}>
            {opt.label}
          </MenuItem>
        ))}
      </TextField>,
    )
  }

  if (type === 'multiple_choice') {
    const selected = (value as string) ?? ''
    return fieldShell(
      title,
      required,
      description,
      error,
      <div className="space-y-2">
        {(options ?? []).map((opt) => {
          const active = selected === opt.id
          return (
            <label
              key={opt.id}
              className={`flex cursor-pointer items-center gap-3 rounded-2xl border px-3 py-2.5 transition ${
                active
                  ? 'border-teal-400 bg-teal-50 shadow-sm'
                  : 'border-slate-200 bg-white hover:border-teal-200'
              } ${disabled ? 'pointer-events-none opacity-60' : ''}`}
            >
              <Radio
                checked={active}
                disabled={disabled}
                onChange={() => onChange(opt.id)}
                size="small"
              />
              <span className="text-sm font-medium text-slate-700">
                {opt.label}
              </span>
            </label>
          )
        })}
      </div>,
    )
  }

  if (type === 'checkbox') {
    const selected = Array.isArray(value) ? (value as string[]) : []
    return fieldShell(
      title,
      required,
      description,
      error,
      <div className="space-y-2">
        {(options ?? []).map((opt) => {
          const active = selected.includes(opt.id)
          return (
            <label
              key={opt.id}
              className={`flex cursor-pointer items-center gap-3 rounded-2xl border px-3 py-2.5 transition ${
                active
                  ? 'border-teal-400 bg-teal-50 shadow-sm'
                  : 'border-slate-200 bg-white hover:border-teal-200'
              } ${disabled ? 'pointer-events-none opacity-60' : ''}`}
            >
              <Checkbox
                checked={active}
                disabled={disabled}
                size="small"
                onChange={(e) => {
                  if (e.target.checked) onChange([...selected, opt.id])
                  else onChange(selected.filter((id) => id !== opt.id))
                }}
              />
              <span className="text-sm font-medium text-slate-700">
                {opt.label}
              </span>
            </label>
          )
        })}
      </div>,
    )
  }

  if (type === 'rating') {
    const max = config?.max ?? 5
    return fieldShell(
      title,
      required,
      description,
      error,
      <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
        <Rating
          max={max}
          size="large"
          value={typeof value === 'number' ? value : 0}
          onChange={(_, v) => onChange(v ?? 0)}
          disabled={disabled}
        />
      </div>,
    )
  }

  if (type === 'linear_scale') {
    const min = config?.min ?? validation?.min ?? 1
    const max = config?.max ?? validation?.max ?? 5
    const current = typeof value === 'number' ? value : min
    return fieldShell(
      title,
      required,
      description,
      error,
      <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
        <Slider
          value={current}
          min={min}
          max={max}
          step={1}
          marks
          valueLabelDisplay="auto"
          disabled={disabled}
          onChange={(_, v) => onChange(v as number)}
        />
        <div className="mt-1 flex justify-between text-xs font-medium text-slate-500">
          <span>{config?.minLabel ?? min}</span>
          <span>{config?.maxLabel ?? max}</span>
        </div>
      </div>,
    )
  }

  if (type === 'grid_choice' || type === 'grid_checkbox') {
    const rows = config?.rows ?? []
    const columns = config?.columns ?? []
    const gridValue =
      (value as Record<string, string | string[]>) ??
      ({} as Record<string, string | string[]>)

    return fieldShell(
      title,
      required,
      description,
      error,
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="w-full min-w-[420px] border-collapse text-sm">
          <thead>
            <tr className="bg-slate-50">
              <th className="p-3 text-left" />
              {columns.map((col) => (
                <th
                  key={col.id}
                  className="p-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-500"
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr
                key={row.id}
                className={idx % 2 ? 'bg-slate-50/60' : 'bg-white'}
              >
                <td className="p-3 font-semibold text-slate-700">{row.label}</td>
                {columns.map((col) => {
                  if (type === 'grid_choice') {
                    return (
                      <td key={col.id} className="p-2 text-center">
                        <Radio
                          checked={gridValue[row.id] === col.id}
                          disabled={disabled}
                          onChange={() =>
                            onChange({ ...gridValue, [row.id]: col.id })
                          }
                        />
                      </td>
                    )
                  }
                  const rowSelected = Array.isArray(gridValue[row.id])
                    ? (gridValue[row.id] as string[])
                    : []
                  return (
                    <td key={col.id} className="p-2 text-center">
                      <Checkbox
                        checked={rowSelected.includes(col.id)}
                        disabled={disabled}
                        onChange={(e) => {
                          const next = e.target.checked
                            ? [...rowSelected, col.id]
                            : rowSelected.filter((id) => id !== col.id)
                          onChange({ ...gridValue, [row.id]: next })
                        }}
                      />
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>,
    )
  }

  return fieldShell(
    title,
    required,
    description,
    error || `Noma’lum tip: ${type}`,
    <TextField
      fullWidth
      value={(value as string) ?? ''}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      error={Boolean(error)}
      sx={roundedSx}
    />,
  )
}
