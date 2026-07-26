import { useMemo, useState, type ReactNode } from 'react'
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  TextField,
} from '@mui/material'
import {
  AddRounded,
  CloseRounded,
  SearchRounded,
  ShortTextRounded,
  SubjectRounded,
  RadioButtonCheckedRounded,
  CheckBoxRounded,
  ArrowDropDownCircleRounded,
  LinearScaleRounded,
  StarRounded,
  CalendarMonthRounded,
  AccessTimeRounded,
  EventRounded,
  EmailRounded,
  PhoneRounded,
  LinkRounded,
  NumbersRounded,
  ImageRounded,
  VideocamRounded,
  AudioFileRounded,
  PictureAsPdfRounded,
  DescriptionRounded,
  TableChartRounded,
  SlideshowRounded,
  FolderZipRounded,
  InsertDriveFileRounded,
  ViewAgendaRounded,
  GridOnRounded,
} from '@mui/icons-material'
import type { QuestionType } from '../../api/types'
import {
  QUESTION_TYPE_DESCRIPTIONS,
  QUESTION_TYPE_GROUPS,
  QUESTION_TYPE_LABELS,
  QUICK_ADD_TYPES,
} from '../../lib/survey'

const TYPE_ICONS: Record<QuestionType, ReactNode> = {
  short_text: <ShortTextRounded fontSize="small" />,
  long_text: <SubjectRounded fontSize="small" />,
  multiple_choice: <RadioButtonCheckedRounded fontSize="small" />,
  checkbox: <CheckBoxRounded fontSize="small" />,
  dropdown: <ArrowDropDownCircleRounded fontSize="small" />,
  linear_scale: <LinearScaleRounded fontSize="small" />,
  rating: <StarRounded fontSize="small" />,
  date: <CalendarMonthRounded fontSize="small" />,
  time: <AccessTimeRounded fontSize="small" />,
  datetime: <EventRounded fontSize="small" />,
  email: <EmailRounded fontSize="small" />,
  phone: <PhoneRounded fontSize="small" />,
  url: <LinkRounded fontSize="small" />,
  number: <NumbersRounded fontSize="small" />,
  file_image: <ImageRounded fontSize="small" />,
  file_video: <VideocamRounded fontSize="small" />,
  file_audio: <AudioFileRounded fontSize="small" />,
  file_pdf: <PictureAsPdfRounded fontSize="small" />,
  file_document: <DescriptionRounded fontSize="small" />,
  file_spreadsheet: <TableChartRounded fontSize="small" />,
  file_presentation: <SlideshowRounded fontSize="small" />,
  file_archive: <FolderZipRounded fontSize="small" />,
  file_any: <InsertDriveFileRounded fontSize="small" />,
  file: <InsertDriveFileRounded fontSize="small" />,
  section: <ViewAgendaRounded fontSize="small" />,
  grid_choice: <GridOnRounded fontSize="small" />,
  grid_checkbox: <GridOnRounded fontSize="small" />,
}

export function AddQuestionPicker({
  open,
  onClose,
  onAdd,
}: {
  open: boolean
  onClose: () => void
  onAdd: (type: QuestionType) => void
}) {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<string>('all')

  const filteredGroups = useMemo(() => {
    const q = search.trim().toLowerCase()
    return QUESTION_TYPE_GROUPS.map((group) => ({
      ...group,
      types: group.types.filter((type) => {
        if (category !== 'all' && group.id !== category) return false
        if (!q) return true
        return (
          QUESTION_TYPE_LABELS[type].toLowerCase().includes(q) ||
          QUESTION_TYPE_DESCRIPTIONS[type].toLowerCase().includes(q) ||
          type.includes(q)
        )
      }),
    })).filter((g) => g.types.length > 0)
  }, [search, category])

  const handleAdd = (type: QuestionType) => {
    onAdd(type)
    onClose()
    setSearch('')
    setCategory('all')
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle
        sx={{
          fontFamily: "'Outfit', sans-serif",
          fontWeight: 700,
          pr: 7,
          position: 'relative',
        }}
      >
        Savol qo‘shish
        <IconButton
          onClick={onClose}
          sx={{ position: 'absolute', right: 12, top: 12 }}
          aria-label="Yopish"
        >
          <CloseRounded />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <div className="space-y-5">
          <TextField
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Savol turini qidiring..."
            fullWidth
            size="small"
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchRounded fontSize="small" />
                  </InputAdornment>
                ),
              },
            }}
          />

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Tez qo‘shish
            </p>
            <div className="flex flex-wrap gap-2">
              {QUICK_ADD_TYPES.map((type) => (
                <Button
                  key={type}
                  size="small"
                  variant="outlined"
                  startIcon={TYPE_ICONS[type]}
                  onClick={() => handleAdd(type)}
                >
                  {QUESTION_TYPE_LABELS[type]}
                </Button>
              ))}
            </div>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1">
            <Chip
              label="Hammasi"
              clickable
              color={category === 'all' ? 'primary' : 'default'}
              onClick={() => setCategory('all')}
            />
            {QUESTION_TYPE_GROUPS.map((g) => (
              <Chip
                key={g.id}
                label={g.label}
                clickable
                color={category === g.id ? 'primary' : 'default'}
                onClick={() => setCategory(g.id)}
              />
            ))}
          </div>

          <div className="space-y-6">
            {filteredGroups.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-500">Natija topilmadi</p>
            ) : (
              filteredGroups.map((group) => (
                <div key={group.id}>
                  {category === 'all' && (
                    <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      {group.label}
                    </p>
                  )}
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {group.types.map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => handleAdd(type)}
                        className="group flex flex-col items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 text-left transition hover:border-teal-300 hover:bg-teal-50/40 hover:shadow-sm"
                      >
                        <span className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100 text-slate-600 transition group-hover:bg-teal-600 group-hover:text-white">
                          {TYPE_ICONS[type]}
                        </span>
                        <div>
                          <p className="text-sm font-semibold text-slate-900">
                            {QUESTION_TYPE_LABELS[type]}
                          </p>
                          <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
                            {QUESTION_TYPE_DESCRIPTIONS[type]}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function AddQuestionTrigger({
  onClick,
  disabled,
  compact,
}: {
  onClick: () => void
  disabled?: boolean
  compact?: boolean
}) {
  if (disabled) return null

  if (compact) {
    return (
      <Button size="small" variant="contained" startIcon={<AddRounded />} onClick={onClick}>
        Qo‘shish
      </Button>
    )
  }

  return (
    <Box
      component="button"
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-teal-200 bg-teal-50/30 px-4 py-4 text-sm font-semibold text-teal-700 transition hover:border-teal-400 hover:bg-teal-50/60"
    >
      <AddRounded fontSize="small" />
      Yangi savol yoki bo‘lim qo‘shish
    </Box>
  )
}
