import { useEffect, useState } from 'react'
import {
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  IconButton,
  MenuItem,
  Radio,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import { AddRounded, DeleteOutlineRounded } from '@mui/icons-material'
import { getFileFormats } from '../../api/surveys'
import type { Question, QuestionOption, QuestionType, SurveyFileFormat } from '../../api/types'
import {
  QUESTION_TYPE_GROUPS,
  QUESTION_TYPE_LABELS,
  createQuestion,
  genId,
  typeIsChoice,
  typeIsFile,
  typeIsGrid,
} from '../../lib/survey'
import {
  getExtensionOptionsForType,
  getMimeOptionsForType,
  normalizeAcceptList,
  normalizeFileFormats,
  normalizeStringList,
} from '../../lib/surveyFileFormats'
import { AddQuestionPicker } from './AddQuestionPicker'
import { ExtensionPicker, MimeTypePicker } from './MimeTypePicker'
import { EditorSection, QuestionEditorShell } from './QuestionEditorParts'
import { QuestionOutline } from './QuestionOutline'

function OptionsEditor({
  question,
  onChange,
  disabled,
}: {
  question: Question
  onChange: (q: Question) => void
  disabled?: boolean
}) {
  const options = question.options ?? []
  const singleCorrect =
    question.type === 'multiple_choice' || question.type === 'dropdown'
  const cfg = question.config ?? {}

  const update = (next: QuestionOption[]) => onChange({ ...question, options: next })

  const setCorrect = (optId: string, checked: boolean) => {
    if (singleCorrect) {
      update(options.map((o) => ({ ...o, isCorrect: o.id === optId ? checked : false })))
      return
    }
    update(options.map((o) => (o.id === optId ? { ...o, isCorrect: checked } : o)))
  }

  const addOther = () => {
    if (options.some((o) => o.isOther)) return
    onChange({
      ...question,
      options: [
        ...options,
        { id: genId('opt'), label: 'Boshqa', isOther: true, isCorrect: false },
      ],
      config: { ...cfg, allowOther: true },
    })
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <Typography variant="body2" className="!font-semibold !text-slate-600">
          Variantlar
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {singleCorrect
            ? 'Bitta to‘g‘ri javobni belgilang'
            : 'Bir yoki bir nechta to‘g‘ri javobni belgilang'}
        </Typography>
      </div>
      {options.map((opt, i) => (
        <div key={opt.id} className="flex items-center gap-1.5">
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
            {i + 1}
          </span>
          {!disabled && (
            <Tooltip title={opt.isCorrect ? 'To‘g‘ri javob' : 'To‘g‘ri deb belgilash'}>
              <span>
                {singleCorrect ? (
                  <Radio
                    size="small"
                    checked={Boolean(opt.isCorrect)}
                    onChange={() => setCorrect(opt.id, true)}
                    color="success"
                    sx={{ p: 0.5 }}
                  />
                ) : (
                  <Checkbox
                    size="small"
                    checked={Boolean(opt.isCorrect)}
                    onChange={(e) => setCorrect(opt.id, e.target.checked)}
                    color="success"
                    sx={{ p: 0.5 }}
                  />
                )}
              </span>
            </Tooltip>
          )}
          <TextField
            size="small"
            fullWidth
            value={opt.label}
            disabled={disabled || opt.isOther}
            placeholder={`Variant ${i + 1}`}
            onChange={(e) =>
              update(options.map((o) => (o.id === opt.id ? { ...o, label: e.target.value } : o)))
            }
            sx={
              opt.isCorrect
                ? {
                    '& .MuiOutlinedInput-root': {
                      bgcolor: 'rgba(16,185,129,0.06)',
                      '& fieldset': { borderColor: 'rgba(16,185,129,0.45)' },
                    },
                  }
                : undefined
            }
          />
          {!disabled && (
            <IconButton
              size="small"
              color="error"
              disabled={options.length <= 1}
              onClick={() => update(options.filter((o) => o.id !== opt.id))}
            >
              <DeleteOutlineRounded fontSize="small" />
            </IconButton>
          )}
        </div>
      ))}
      {!disabled && (
        <div className="flex flex-wrap gap-2 pt-1">
          <Button
            size="small"
            variant="outlined"
            startIcon={<AddRounded />}
            onClick={() =>
              update([...options, { id: genId('opt'), label: `Variant ${options.length + 1}` }])
            }
          >
            Variant
          </Button>
          {question.type !== 'dropdown' && !options.some((o) => o.isOther) && (
            <Button size="small" variant="outlined" onClick={addOther}>
              “Boshqa”
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

function GridEditor({
  question,
  onChange,
  disabled,
}: {
  question: Question
  onChange: (q: Question) => void
  disabled?: boolean
}) {
  const rows = question.config?.rows ?? []
  const columns = question.config?.columns ?? []

  const setRows = (next: typeof rows) =>
    onChange({ ...question, config: { ...question.config, rows: next } })
  const setCols = (next: typeof columns) =>
    onChange({ ...question, config: { ...question.config, columns: next } })

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Qatorlar</p>
        {rows.map((r) => (
          <div key={r.id} className="flex gap-2">
            <TextField
              size="small"
              fullWidth
              value={r.label}
              disabled={disabled}
              onChange={(e) =>
                setRows(rows.map((x) => (x.id === r.id ? { ...x, label: e.target.value } : x)))
              }
            />
            {!disabled && (
              <IconButton
                size="small"
                color="error"
                disabled={rows.length <= 1}
                onClick={() => setRows(rows.filter((x) => x.id !== r.id))}
              >
                <DeleteOutlineRounded fontSize="small" />
              </IconButton>
            )}
          </div>
        ))}
        {!disabled && (
          <Button
            size="small"
            variant="outlined"
            startIcon={<AddRounded />}
            onClick={() => setRows([...rows, { id: genId('row'), label: `Qator ${rows.length + 1}` }])}
          >
            Qator
          </Button>
        )}
      </div>
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Ustunlar</p>
        {columns.map((c) => (
          <div key={c.id} className="flex gap-2">
            <TextField
              size="small"
              fullWidth
              value={c.label}
              disabled={disabled}
              onChange={(e) =>
                setCols(columns.map((x) => (x.id === c.id ? { ...x, label: e.target.value } : x)))
              }
            />
            {!disabled && (
              <IconButton
                size="small"
                color="error"
                disabled={columns.length <= 1}
                onClick={() => setCols(columns.filter((x) => x.id !== c.id))}
              >
                <DeleteOutlineRounded fontSize="small" />
              </IconButton>
            )}
          </div>
        ))}
        {!disabled && (
          <Button
            size="small"
            variant="outlined"
            startIcon={<AddRounded />}
            onClick={() =>
              setCols([...columns, { id: genId('col'), label: `Ustun ${columns.length + 1}` }])
            }
          >
            Ustun
          </Button>
        )}
      </div>
    </div>
  )
}

function QuestionEditorPanel({
  question,
  index,
  total,
  disabled,
  fileFormats,
  onChange,
  onDelete,
  onMoveUp,
  onMoveDown,
}: {
  question: Question
  index: number
  total: number
  disabled?: boolean
  fileFormats: SurveyFileFormat[]
  onChange: (q: Question) => void
  onDelete: () => void
  onMoveUp: () => void
  onMoveDown: () => void
}) {
  const isSection = question.type === 'section'
  const cfg = question.config ?? {}
  const val = question.validation ?? {}

  const setConfig = (patch: Record<string, unknown>) =>
    onChange({ ...question, config: { ...cfg, ...patch } })

  const setValidation = (patch: Record<string, unknown>) =>
    onChange({ ...question, validation: { ...val, ...patch } })

  const handleTypeChange = (type: QuestionType) => {
    if (type === question.type) return
    const fresh = createQuestion(type)
    onChange({ ...fresh, id: question.id, title: question.title || fresh.title })
  }

  const hasChoice = typeIsChoice(question.type) && question.options
  const hasFile = typeIsFile(question.type)
  const hasGrid = typeIsGrid(question.type)
  const hasValidation =
    question.type === 'short_text' ||
    question.type === 'long_text' ||
    question.type === 'number'

  return (
    <QuestionEditorShell
      index={index}
      total={total}
      isSection={isSection}
      typeLabel={QUESTION_TYPE_LABELS[question.type]}
      required={question.required}
      disabled={disabled}
      onMoveUp={onMoveUp}
      onMoveDown={onMoveDown}
      onDelete={onDelete}
      header={
        <Stack spacing={2}>
          <TextField
            select
            label="Savol turi"
            size="small"
            fullWidth
            value={question.type}
            disabled={disabled}
            onChange={(e) => handleTypeChange(e.target.value as QuestionType)}
          >
            {QUESTION_TYPE_GROUPS.map((group) => [
              <MenuItem key={group.id} disabled sx={{ opacity: 0.55, fontSize: 12 }}>
                {group.label}
              </MenuItem>,
              ...group.types.map((t) => (
                <MenuItem key={t} value={t} sx={{ pl: 3 }}>
                  {QUESTION_TYPE_LABELS[t]}
                </MenuItem>
              )),
            ])}
          </TextField>
          <TextField
            label={isSection ? 'Bo‘lim sarlavhasi' : 'Savol matni'}
            value={question.title ?? ''}
            onChange={(e) => onChange({ ...question, title: e.target.value })}
            disabled={disabled}
            fullWidth
          />
          {!isSection && (
            <FormControlLabel
              control={
                <Switch
                  checked={Boolean(question.required)}
                  onChange={(e) => onChange({ ...question, required: e.target.checked })}
                  disabled={disabled}
                />
              }
              label="Majburiy javob"
            />
          )}
        </Stack>
      }
    >
      {!isSection && (
        <EditorSection
          title="Yordamchi matn"
          description="Savol ostida ko‘rinadigan izoh"
          defaultOpen={Boolean(question.description)}
        >
          <TextField
            value={question.description ?? ''}
            onChange={(e) => onChange({ ...question, description: e.target.value })}
            fullWidth
            multiline
            minRows={2}
            disabled={disabled}
            placeholder="Ixtiyoriy qo‘shimcha tushuntirish..."
          />
        </EditorSection>
      )}

      {hasChoice && (
        <EditorSection title="Javob variantlari" description="Foydalanuvchi tanlaydigan variantlar">
          <OptionsEditor question={question} onChange={onChange} disabled={disabled} />
          {question.type === 'checkbox' && (
            <Box className="mt-4 grid gap-3 border-t border-slate-100 pt-4 sm:grid-cols-2">
              <TextField
                label="Minimal tanlovlar"
                type="number"
                size="small"
                value={cfg.minSelections ?? ''}
                disabled={disabled}
                onChange={(e) =>
                  setConfig({
                    minSelections: e.target.value ? Number(e.target.value) : undefined,
                  })
                }
              />
              <TextField
                label="Maksimal tanlovlar"
                type="number"
                size="small"
                value={cfg.maxSelections ?? ''}
                disabled={disabled}
                onChange={(e) =>
                  setConfig({
                    maxSelections: e.target.value ? Number(e.target.value) : undefined,
                  })
                }
              />
            </Box>
          )}
          <div className="mt-4 border-t border-slate-100 pt-4">
            <FormControlLabel
              control={
                <Switch
                  checked={Boolean(cfg.shuffleOptions)}
                  onChange={(e) => setConfig({ shuffleOptions: e.target.checked })}
                  disabled={disabled}
                />
              }
              label="Variantlarni aralashtirish"
            />
          </div>
        </EditorSection>
      )}

      {question.type === 'linear_scale' && (
        <EditorSection title="Shkala sozlamalari">
          <Box className="grid gap-3 sm:grid-cols-2">
            <TextField
              label="Min"
              type="number"
              size="small"
              value={cfg.scaleMin ?? 1}
              disabled={disabled}
              onChange={(e) => setConfig({ scaleMin: Number(e.target.value) || 1 })}
            />
            <TextField
              label="Max"
              type="number"
              size="small"
              value={cfg.scaleMax ?? 5}
              disabled={disabled}
              onChange={(e) => setConfig({ scaleMax: Number(e.target.value) || 5 })}
            />
            <TextField
              label="Pastki yorliq"
              size="small"
              value={(cfg.scaleMinLabel as string) ?? (cfg.minLabel as string) ?? ''}
              disabled={disabled}
              onChange={(e) =>
                setConfig({ scaleMinLabel: e.target.value, minLabel: e.target.value })
              }
            />
            <TextField
              label="Yuqori yorliq"
              size="small"
              value={(cfg.scaleMaxLabel as string) ?? (cfg.maxLabel as string) ?? ''}
              disabled={disabled}
              onChange={(e) =>
                setConfig({ scaleMaxLabel: e.target.value, maxLabel: e.target.value })
              }
            />
          </Box>
        </EditorSection>
      )}

      {question.type === 'rating' && (
        <EditorSection title="Reyting sozlamalari">
          <TextField
            label="Yulduzlar soni (1–10)"
            type="number"
            size="small"
            sx={{ maxWidth: 220 }}
            value={cfg.maxStars ?? cfg.ratingMax ?? 5}
            disabled={disabled}
            onChange={(e) => {
              const n = Math.min(10, Math.max(1, Number(e.target.value) || 5))
              setConfig({ maxStars: n, ratingMax: n })
            }}
          />
        </EditorSection>
      )}

      {hasGrid && (
        <EditorSection title="Jadval tuzilmasi" description="Qatorlar va ustunlar">
          <GridEditor question={question} onChange={onChange} disabled={disabled} />
        </EditorSection>
      )}

      {hasFile && (
        <EditorSection title="Fayl yuklash sozlamalari">
          <div className="space-y-4">
            <Box className="grid gap-3 sm:grid-cols-2">
              <TextField
                label="Maks. hajm (MB)"
                type="number"
                size="small"
                value={cfg.maxFileSizeMb ?? cfg.maxSizeMB ?? ''}
                disabled={disabled}
                onChange={(e) => {
                  const n = e.target.value ? Number(e.target.value) : undefined
                  setConfig({ maxFileSizeMb: n, maxSizeMB: n })
                }}
              />
              <TextField
                label="Maks. fayllar (1–20)"
                type="number"
                size="small"
                value={cfg.maxFiles ?? ''}
                disabled={disabled}
                onChange={(e) =>
                  setConfig({
                    maxFiles: e.target.value
                      ? Math.min(20, Math.max(1, Number(e.target.value)))
                      : undefined,
                  })
                }
              />
            </Box>
            <MimeTypePicker
              options={getMimeOptionsForType(question.type, fileFormats)}
              value={normalizeAcceptList(cfg.accept as string[] | string | undefined)}
              onChange={(accept) => setConfig({ accept })}
              disabled={disabled}
            />
            <ExtensionPicker
              options={getExtensionOptionsForType(question.type, fileFormats)}
              value={normalizeStringList(
                cfg.allowedExtensions as string[] | string | undefined,
              )}
              onChange={(allowedExtensions) => setConfig({ allowedExtensions })}
              disabled={disabled}
            />
          </div>
        </EditorSection>
      )}

      {hasValidation && (
        <EditorSection title="Validatsiya" defaultOpen={false}>
          <Box className="grid gap-3 sm:grid-cols-2">
            {(question.type === 'short_text' || question.type === 'long_text') && (
              <>
                <TextField
                  label="Min uzunlik"
                  type="number"
                  size="small"
                  value={val.minLength ?? ''}
                  disabled={disabled}
                  onChange={(e) =>
                    setValidation({
                      minLength: e.target.value ? Number(e.target.value) : undefined,
                    })
                  }
                />
                <TextField
                  label="Max uzunlik"
                  type="number"
                  size="small"
                  value={val.maxLength ?? ''}
                  disabled={disabled}
                  onChange={(e) =>
                    setValidation({
                      maxLength: e.target.value ? Number(e.target.value) : undefined,
                    })
                  }
                />
              </>
            )}
            {question.type === 'number' && (
              <>
                <TextField
                  label="Min qiymat"
                  type="number"
                  size="small"
                  value={val.min ?? ''}
                  disabled={disabled}
                  onChange={(e) =>
                    setValidation({
                      min: e.target.value !== '' ? Number(e.target.value) : undefined,
                    })
                  }
                />
                <TextField
                  label="Max qiymat"
                  type="number"
                  size="small"
                  value={val.max ?? ''}
                  disabled={disabled}
                  onChange={(e) =>
                    setValidation({
                      max: e.target.value !== '' ? Number(e.target.value) : undefined,
                    })
                  }
                />
              </>
            )}
          </Box>
        </EditorSection>
      )}

      <EditorSection title="Qo‘shimcha" description="Texnik identifikator" defaultOpen={false}>
        <TextField
          label="Savol ID"
          value={question.id}
          onChange={(e) => onChange({ ...question, id: e.target.value })}
          disabled={disabled}
          fullWidth
          size="small"
          helperText="API uchun noyob identifikator"
          slotProps={{ input: { sx: { fontFamily: 'monospace', fontSize: 12 } } }}
        />
      </EditorSection>
    </QuestionEditorShell>
  )
}

export function SurveyQuestionEditor({
  questions,
  onChange,
  disabled,
  addOpen: addOpenProp,
  onAddOpenChange,
}: {
  questions: Question[]
  onChange: (questions: Question[]) => void
  disabled?: boolean
  addOpen?: boolean
  onAddOpenChange?: (open: boolean) => void
}) {
  const [fileFormats, setFileFormats] = useState<SurveyFileFormat[]>([])
  const [activeIndex, setActiveIndex] = useState(0)
  const [internalAddOpen, setInternalAddOpen] = useState(false)
  const addOpen = addOpenProp ?? internalAddOpen
  const setAddOpen = onAddOpenChange ?? setInternalAddOpen

  useEffect(() => {
    getFileFormats()
      .then((data) => setFileFormats(normalizeFileFormats(data)))
      .catch(() => setFileFormats([]))
  }, [])

  useEffect(() => {
    if (activeIndex >= questions.length) {
      setActiveIndex(Math.max(0, questions.length - 1))
    }
  }, [questions.length, activeIndex])

  const updateQuestion = (index: number, q: Question) => {
    const next = [...questions]
    next[index] = q
    onChange(next)
  }

  const removeQuestion = (index: number) => {
    if (questions.length <= 1) return
    const next = questions.filter((_, i) => i !== index)
    onChange(next)
    if (activeIndex >= next.length) setActiveIndex(next.length - 1)
  }

  const moveQuestion = (index: number, dir: -1 | 1) => {
    const target = index + dir
    if (target < 0 || target >= questions.length) return
    const next = [...questions]
    ;[next[index], next[target]] = [next[target], next[index]]
    onChange(next)
    if (activeIndex === index) setActiveIndex(target)
    else if (activeIndex === target) setActiveIndex(index)
  }

  const addQuestion = (type: QuestionType) => {
    onChange([...questions, createQuestion(type)])
    setActiveIndex(questions.length)
  }

  const activeQuestion = questions[activeIndex]

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="grid min-h-0 flex-1 items-stretch gap-6 xl:grid-cols-[minmax(240px,280px)_minmax(0,1fr)]">
        <aside className="flex min-h-[280px] flex-col xl:min-h-0">
          <QuestionOutline
            questions={questions}
            activeIndex={activeIndex}
            disabled={disabled}
            onSelect={setActiveIndex}
            onMove={moveQuestion}
            onDelete={removeQuestion}
          />
        </aside>

        <main className="min-w-0 xl:self-start">
          {activeQuestion ? (
            <QuestionEditorPanel
              key={`${activeQuestion.id}-${activeIndex}`}
              question={activeQuestion}
              index={activeIndex}
              total={questions.length}
              disabled={disabled}
              fileFormats={fileFormats}
              onChange={(q) => updateQuestion(activeIndex, q)}
              onDelete={() => removeQuestion(activeIndex)}
              onMoveUp={() => moveQuestion(activeIndex, -1)}
              onMoveDown={() => moveQuestion(activeIndex, 1)}
            />
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
              <p className="text-sm text-slate-500">Savol tanlang yoki yangisini qo‘shing</p>
            </div>
          )}
        </main>
      </div>

      <AddQuestionPicker open={addOpen} onClose={() => setAddOpen(false)} onAdd={addQuestion} />
    </div>
  )
}
