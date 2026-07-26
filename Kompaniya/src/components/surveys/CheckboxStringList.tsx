import { Button, Typography } from '@mui/material'

export function CheckboxStringList({
  label,
  options,
  value,
  onChange,
  disabled,
  hint,
  emptyMessage = "Ro'yxat yuklanmadi",
  selectedFooter,
  unselectedFooter = "Tanlanmagan — tur uchun default formatlar qo'llaniladi",
}: {
  label: string
  options: string[]
  value?: string[]
  onChange: (value: string[] | undefined) => void
  disabled?: boolean
  hint?: string
  emptyMessage?: string
  selectedFooter?: (count: number) => string
  unselectedFooter?: string
}) {
  const selected = new Set(value ?? [])

  const toggle = (item: string) => {
    if (disabled) return
    const next = new Set(selected)
    if (next.has(item)) next.delete(item)
    else next.add(item)
    const arr = [...next]
    onChange(arr.length ? arr : undefined)
  }

  if (!options.length) {
    return (
      <Typography variant="caption" color="text.secondary">
        {emptyMessage}
      </Typography>
    )
  }

  const footer =
    selected.size > 0
      ? (selectedFooter?.(selected.size) ??
        `${selected.size} ta tanlangan — API ga string[] sifatida yuboriladi`)
      : unselectedFooter

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-medium text-slate-700">{label}</span>
        {!disabled && (
          <div className="flex gap-1">
            <Button
              type="button"
              size="small"
              onClick={() => onChange([...options])}
              disabled={!options.length}
            >
              Hammasi
            </Button>
            <Button type="button" size="small" onClick={() => onChange(undefined)}>
              Tozalash
            </Button>
          </div>
        )}
      </div>
      {hint && <p className="text-xs text-slate-500">{hint}</p>}
      <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-200 bg-white p-3">
        <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
          {options.map((item) => {
            const checked = selected.has(item)
            return (
              <label
                key={item}
                className={`flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-xs transition ${
                  checked
                    ? 'bg-teal-50 text-teal-800'
                    : 'text-slate-700 hover:bg-slate-50'
                } ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
              >
                <input
                  type="checkbox"
                  className="h-3.5 w-3.5 rounded border-slate-300 accent-teal-600"
                  checked={checked}
                  disabled={disabled}
                  onChange={() => toggle(item)}
                />
                <span className="font-mono">{item}</span>
              </label>
            )
          })}
        </div>
      </div>
      <p className="text-xs text-slate-400">{footer}</p>
    </div>
  )
}
