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
}

export type QuestionValidation = {
  min?: number
  max?: number
  minLength?: number
  maxLength?: number
  pattern?: string
}

export type QuestionConfig = {
  min?: number
  max?: number
  minLabel?: string
  maxLabel?: string
  rows?: { id: string; label: string }[]
  columns?: { id: string; label: string }[]
  accept?: string
  maxSizeMb?: number
}

export type SurveyQuestion = {
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
  showProgressBar?: boolean
  confirmationMessage?: string
}

export type RespondentFieldType = 'text' | 'phone' | 'email' | string

export type RespondentField = {
  key: string
  label: string
  type: RespondentFieldType
  required?: boolean
  placeholder?: string
  description?: string
}

export type SurveyForm = {
  id: string
  title: string
  description?: string
  settings?: SurveySettings
  /** API qaytargan respondent maydonlari (name, phone, …) — questions dan oldin */
  respondentFields?: RespondentField[]
  questions: SurveyQuestion[]
  status: SurveyStatus
}

export type ApiResponse<T> = {
  success: boolean
  message: string
  data: T
}

export type SubmitPayload = {
  name: string
  phone: string
  answers: Record<string, unknown>
}

export type SubmitResult = {
  id: string
  name: string
  phone: string
  confirmationMessage?: string
  createdAt: string
}

export type UploadResult = {
  path?: string
  url?: string
}
