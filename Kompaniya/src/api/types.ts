export type ApiSuccess<T> = {
  success: true
  message: string
  data: T
}

export type ApiErrorBody = {
  success: false
  message: string
  error?: string
}

export type Company = {
  id: string
  name: string
  phone: string
  username: string
  created_at: string
  updated_at: string
}

export type LoginData = {
  token: string
  company: Company
}

export type UpdateCompanyPayload = {
  name: string
  phone: string
  username: string
  password?: string
}

export type LoginPayload = {
  username: string
  password: string
}

export type SurveyStatus = 'draft' | 'published' | 'closed'

export type QuestionType =
  | 'short_text'
  | 'long_text'
  | 'multiple_choice'
  | 'checkbox'
  | 'dropdown'
  | 'linear_scale'
  | 'rating'
  | 'date'
  | 'time'
  | 'datetime'
  | 'email'
  | 'phone'
  | 'url'
  | 'number'
  | 'file_image'
  | 'file_video'
  | 'file_audio'
  | 'file_pdf'
  | 'file_document'
  | 'file_spreadsheet'
  | 'file_presentation'
  | 'file_archive'
  | 'file_any'
  | 'file'
  | 'section'
  | 'grid_choice'
  | 'grid_checkbox'

export type QuestionOption = {
  id: string
  label: string
  isOther?: boolean
  isCorrect?: boolean
}

export type QuestionValidation = {
  min?: number
  max?: number
  minLength?: number
  maxLength?: number
  pattern?: string
}

export type QuestionConfig = {
  shuffleOptions?: boolean
  allowOther?: boolean
  minSelections?: number
  maxSelections?: number
  scaleMin?: number
  scaleMax?: number
  scaleMinLabel?: string
  scaleMaxLabel?: string
  /** legacy alias */
  minLabel?: string
  /** legacy alias */
  maxLabel?: string
  maxStars?: number
  /** legacy alias */
  ratingMax?: number
  rows?: { id: string; label: string }[]
  columns?: { id: string; label: string }[]
  accept?: string[]
  allowedExtensions?: string[]
  maxFileSizeMb?: number
  /** legacy alias */
  maxSizeMB?: number
  maxFiles?: number
  [key: string]: unknown
}

export type Question = {
  id: string
  type: QuestionType
  title?: string
  description?: string
  required?: boolean
  options?: QuestionOption[]
  validation?: QuestionValidation
  config?: QuestionConfig
}

export type SurveySettings = {
  collectEmail?: boolean
  shuffleQuestions?: boolean
  confirmationMessage?: string
  showProgressBar?: boolean
}

/** Forma respondent maydonlari — API o‘zi qaytaradi */
export type RespondentField = {
  key: string
  label: string
  type: string
  required?: boolean
}

export type Survey = {
  id: string
  companyId: string
  slug: string
  title: string
  description: string
  settings: SurveySettings
  questions: Question[]
  respondentFields?: RespondentField[]
  status: SurveyStatus
  sortOrder: number
  questionCount: number
  responseUrl: string
  publishedAt?: string | null
  closedAt?: string | null
  createdAt?: string
  updatedAt?: string
}

export type SurveyPayload = {
  slug: string
  title: string
  description?: string
  settings?: SurveySettings
  questions: Question[]
  sortOrder?: number
}

export type SurveyResponseItem = {
  id: string
  surveyId: string
  surveySlug?: string
  surveyTitle?: string
  name: string
  phone: string
  answers: Record<string, unknown>
  createdAt: string
  email?: string | null
}

export type SurveyResponseDetail = SurveyResponseItem & {
  surveyStatus?: SurveyStatus
  questions: Question[]
}

/** @deprecated alias — SurveyResponseItem ishlatilsin */
export type SurveyResponse = SurveyResponseItem

export type SurveyResponseListResult = {
  data: SurveyResponseItem[]
  total: number
  page: number
  limit: number
}

export type SurveyResponseListParams = {
  page?: number
  limit?: number
}

export type ResponseSummary = {
  surveyId: string
  surveySlug: string
  surveyTitle: string
  surveyStatus: SurveyStatus
  totalResponses: number
  todayResponses: number
  weekResponses: number
  firstResponseAt?: string | null
  lastResponseAt?: string | null
}

export type SurveyFileFormat = {
  questionType: string
  category?: string
  labelUz?: string
  mimeTypes: string[]
  extensions: string[]
  defaultMaxSizeMb?: number
  defaultMaxFiles?: number
}

/** API array yoki map qaytarishi mumkin */
export type FileFormats = SurveyFileFormat[] | Record<string, Partial<SurveyFileFormat> | unknown>

export type SurveyUploadResult = {
  path: string
  url?: string
}

export type SurveyLinkBaseSetting = {
  key: string
  base_url: string
  updated_at: string
}

export type UpdateSurveyLinkBasePayload = {
  base_url: string
}
