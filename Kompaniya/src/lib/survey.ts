import type { Question, QuestionType, SurveySettings, SurveyStatus } from '../api/types'

export const STATUS_META: Record<
  SurveyStatus,
  { label: string; bg: string; color: string }
> = {
  draft: { label: 'Loyiha', bg: 'rgba(148,163,184,0.15)', color: '#475569' },
  published: { label: 'Nashr qilingan', bg: 'rgba(13,148,136,0.12)', color: '#0f766e' },
  closed: { label: 'Yopilgan', bg: 'rgba(245,158,11,0.12)', color: '#b45309' },
}

export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  short_text: 'Qisqa matn',
  long_text: 'Uzun matn',
  multiple_choice: 'Bitta tanlov',
  checkbox: 'Ko‘p tanlov',
  dropdown: 'Ro‘yxatdan tanlash',
  linear_scale: 'Chiziqli shkala',
  rating: 'Yulduzcha reyting',
  date: 'Sana',
  time: 'Vaqt',
  datetime: 'Sana va vaqt',
  email: 'Email',
  phone: 'Telefon',
  url: 'Havola',
  number: 'Raqam',
  file_image: 'Rasm',
  file_video: 'Video',
  file_audio: 'Audio',
  file_pdf: 'PDF hujjat',
  file_document: 'Matn hujjat',
  file_spreadsheet: 'Jadval (Excel, CSV)',
  file_presentation: 'Taqdimot',
  file_archive: 'Arxiv',
  file_any: 'Istalgan fayl',
  file: 'Fayl (eski)',
  section: 'Bo‘lim sarlavhasi',
  grid_choice: 'Jadval — bitta tanlov',
  grid_checkbox: 'Jadval — ko‘p tanlov',
}

export const QUESTION_TYPE_DESCRIPTIONS: Record<QuestionType, string> = {
  short_text: 'Bir qatorli qisqa javob',
  long_text: 'Ko‘p qatorli uzun matn',
  multiple_choice: 'Variantlardan bittasini tanlash',
  checkbox: 'Bir nechta variant tanlash',
  dropdown: 'Ro‘yxatdan bitta tanlov',
  linear_scale: 'Raqamli shkala (masalan 1–5)',
  rating: 'Yulduzcha bilan baholash',
  date: 'Sana (YYYY-MM-DD)',
  time: 'Vaqt (HH:MM)',
  datetime: 'Sana va vaqt birga',
  email: 'Email manzil',
  phone: 'Telefon raqam',
  url: 'Veb-havola',
  number: 'Raqamli qiymat',
  file_image: 'Rasm fayllari (JPG, PNG, …)',
  file_video: 'Video fayllari (MP4, WebM, …)',
  file_audio: 'Audio fayllari (MP3, WAV, …)',
  file_pdf: 'PDF hujjatlar',
  file_document: 'Word, TXT va boshqa hujjatlar',
  file_spreadsheet: 'Excel, CSV jadvallar',
  file_presentation: 'PowerPoint taqdimotlar',
  file_archive: 'ZIP, RAR arxivlar',
  file_any: 'Istalgan fayl turi',
  file: 'Istalgan fayl (eski nom)',
  section: 'Bo‘lim sarlavhasi (javobsiz)',
  grid_choice: 'Jadval — har qator uchun bitta tanlov',
  grid_checkbox: 'Jadval — har qator uchun ko‘p tanlov',
}

export const QUESTION_TYPE_GROUPS: { id: string; label: string; types: QuestionType[] }[] = [
  { id: 'text', label: 'Matn', types: ['short_text', 'long_text'] },
  { id: 'choice', label: 'Tanlov', types: ['multiple_choice', 'checkbox', 'dropdown'] },
  { id: 'scale', label: 'Shkala', types: ['linear_scale', 'rating'] },
  { id: 'datetime', label: 'Sana va vaqt', types: ['date', 'time', 'datetime'] },
  { id: 'contact', label: 'Aloqa', types: ['email', 'phone', 'url', 'number'] },
  {
    id: 'file',
    label: 'Fayl yuklash',
    types: [
      'file_image',
      'file_video',
      'file_audio',
      'file_pdf',
      'file_document',
      'file_spreadsheet',
      'file_presentation',
      'file_archive',
      'file_any',
    ],
  },
  { id: 'structure', label: 'Tuzilma', types: ['section', 'grid_choice', 'grid_checkbox'] },
]

export const QUICK_ADD_TYPES: QuestionType[] = [
  'short_text',
  'section',
  'multiple_choice',
  'file_image',
]

export const OPTION_TYPES: QuestionType[] = ['multiple_choice', 'checkbox', 'dropdown']
export const GRID_TYPES: QuestionType[] = ['grid_choice', 'grid_checkbox']
export const FILE_TYPES: QuestionType[] = [
  'file_image',
  'file_video',
  'file_audio',
  'file_pdf',
  'file_document',
  'file_spreadsheet',
  'file_presentation',
  'file_archive',
  'file_any',
  'file',
]

export function typeNeedsOptions(type: QuestionType) {
  return OPTION_TYPES.includes(type)
}

export function typeIsGrid(type: QuestionType) {
  return GRID_TYPES.includes(type)
}

export function typeIsFile(type: QuestionType) {
  return FILE_TYPES.includes(type)
}

export function typeIsChoice(type: QuestionType) {
  return OPTION_TYPES.includes(type)
}

export function genId(prefix = 'q') {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
}

export function defaultSettings(): SurveySettings {
  return {
    collectEmail: false,
    shuffleQuestions: false,
    showProgressBar: true,
    confirmationMessage: 'Javobingiz uchun rahmat!',
  }
}

export function createQuestion(type: QuestionType = 'short_text'): Question {
  const id = genId(type === 'section' ? 'section' : 'q')
  const base: Question = { id, type, title: '' }

  switch (type) {
    case 'section':
      return { ...base, title: 'Yangi bo‘lim' }
    case 'multiple_choice':
    case 'checkbox':
    case 'dropdown':
      return {
        ...base,
        title: 'Savol matni',
        options: [
          { id: genId('opt'), label: 'Variant 1', isCorrect: false },
          { id: genId('opt'), label: 'Variant 2', isCorrect: false },
        ],
        config: type === 'checkbox' ? { minSelections: 1 } : undefined,
      }
    case 'linear_scale':
      return {
        ...base,
        title: 'Savol matni',
        config: {
          scaleMin: 1,
          scaleMax: 5,
          scaleMinLabel: 'Past',
          scaleMaxLabel: 'Yuqori',
          minLabel: 'Past',
          maxLabel: 'Yuqori',
        },
      }
    case 'rating':
      return {
        ...base,
        title: 'Savol matni',
        config: { maxStars: 5, ratingMax: 5 },
      }
    case 'grid_choice':
    case 'grid_checkbox':
      return {
        ...base,
        title: 'Savol matni',
        config: {
          rows: [
            { id: genId('row'), label: 'Qator 1' },
            { id: genId('row'), label: 'Qator 2' },
          ],
          columns: [
            { id: genId('col'), label: 'Yomon' },
            { id: genId('col'), label: 'O‘rtacha' },
            { id: genId('col'), label: 'Yaxshi' },
          ],
        },
      }
    case 'file':
    case 'file_image':
    case 'file_video':
    case 'file_audio':
    case 'file_pdf':
    case 'file_document':
    case 'file_spreadsheet':
    case 'file_presentation':
    case 'file_archive':
    case 'file_any':
      return {
        ...base,
        title: 'Fayl yuklang',
        config: { maxFileSizeMb: 10, maxSizeMB: 10, maxFiles: 1 },
      }
    default:
      return { ...base, title: 'Savol matni' }
  }
}

export function countAnswerable(questions: Question[]) {
  return questions.filter((q) => q.type !== 'section').length
}

export function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

export function syncSlugWithTitle(title: string, isNew: boolean, currentSlug: string) {
  if (!isNew) return currentSlug
  return slugify(title)
}

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export function isValidSlug(value: string) {
  return SLUG_PATTERN.test(value)
}

export function descriptionToPlain(value?: string | null) {
  if (!value) return ''
  const trimmed = value.trim()
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) return trimmed
  try {
    const parsed = JSON.parse(trimmed) as { ops?: { insert?: unknown }[] }
    if (!Array.isArray(parsed?.ops)) return trimmed
    return parsed.ops
      .map((op) => (typeof op.insert === 'string' ? op.insert : ''))
      .join('')
      .replace(/\n+/g, ' ')
      .trim()
  } catch {
    return trimmed
  }
}
