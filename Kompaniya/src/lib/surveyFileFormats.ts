import type { QuestionType, SurveyFileFormat } from '../api/types'

export function normalizeFileFormats(
  raw: SurveyFileFormat[] | Record<string, Partial<SurveyFileFormat> | unknown> | null | undefined,
): SurveyFileFormat[] {
  if (!raw) return []
  if (Array.isArray(raw)) {
    return raw
      .filter((f) => f && typeof f === 'object' && f.questionType)
      .map((f) => ({
        questionType: f.questionType,
        category: f.category,
        labelUz: f.labelUz,
        mimeTypes: Array.isArray(f.mimeTypes) ? f.mimeTypes : [],
        extensions: Array.isArray(f.extensions) ? f.extensions : [],
        defaultMaxSizeMb: f.defaultMaxSizeMb,
        defaultMaxFiles: f.defaultMaxFiles,
      }))
  }

  return Object.entries(raw).map(([questionType, value]) => {
    const v =
      value && typeof value === 'object'
        ? (value as Partial<SurveyFileFormat> & {
            maxSizeMB?: number
            mimeTypes?: string[]
            extensions?: string[]
          })
        : {}
    return {
      questionType,
      category: v.category,
      labelUz: v.labelUz,
      mimeTypes: Array.isArray(v.mimeTypes) ? v.mimeTypes : [],
      extensions: Array.isArray(v.extensions) ? v.extensions : [],
      defaultMaxSizeMb: v.defaultMaxSizeMb ?? v.maxSizeMB,
      defaultMaxFiles: v.defaultMaxFiles,
    }
  })
}

export function getFileFormatKey(type: QuestionType): string {
  return type === 'file' ? 'file_any' : type
}

export function normalizeAcceptList(accept?: string | string[]): string[] {
  if (!accept) return []
  return Array.isArray(accept) ? accept : [accept]
}

export function normalizeStringList(value?: string | string[]): string[] {
  if (!value) return []
  return Array.isArray(value) ? value : [value]
}

export function getMimeOptionsForType(
  type: QuestionType,
  formats: SurveyFileFormat[],
): string[] {
  const key = getFileFormatKey(type)
  const format = formats.find((f) => f.questionType === key)
  if (!format?.mimeTypes.length) return []

  const mimes = format.mimeTypes
  if (mimes.length === 1 && mimes[0] === '*/*') {
    const all = new Set<string>()
    for (const f of formats) {
      for (const m of f.mimeTypes) {
        if (m !== '*/*') all.add(m)
      }
    }
    return [...all].sort()
  }

  return [...mimes].sort()
}

export function getExtensionOptionsForType(
  type: QuestionType,
  formats: SurveyFileFormat[],
): string[] {
  const key = getFileFormatKey(type)
  const format = formats.find((f) => f.questionType === key)
  if (!format) return []

  if (format.extensions.length > 0) {
    return [...format.extensions].sort()
  }

  const all = new Set<string>()
  for (const f of formats) {
    for (const ext of f.extensions) all.add(ext)
  }
  return [...all].sort()
}
