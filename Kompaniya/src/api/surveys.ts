import { apiRequest, apiUpload } from './client'
import type {
  FileFormats,
  Question,
  ResponseSummary,
  Survey,
  SurveyPayload,
  SurveyResponseDetail,
  SurveyResponseItem,
  SurveyResponseListParams,
  SurveyResponseListResult,
  SurveyUploadResult,
} from './types'

const BASE = '/company/surveys'

function buildQuery(params: SurveyResponseListParams = {}) {
  const q = new URLSearchParams()
  if (params.page != null) q.set('page', String(params.page))
  if (params.limit != null) q.set('limit', String(params.limit))
  const s = q.toString()
  return s ? `?${s}` : ''
}

function parseAnswers(raw: unknown): Record<string, unknown> {
  if (!raw) return {}
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw) as unknown
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : {}
    } catch {
      return {}
    }
  }
  if (typeof raw === 'object' && !Array.isArray(raw)) {
    return raw as Record<string, unknown>
  }
  return {}
}

function parseQuestions(raw: unknown): Question[] {
  if (!raw) return []
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw) as unknown
      return Array.isArray(parsed) ? (parsed as Question[]) : []
    } catch {
      return []
    }
  }
  return Array.isArray(raw) ? (raw as Question[]) : []
}

function normalizeItem(
  item: Omit<SurveyResponseItem, 'answers'> & { answers?: unknown },
): SurveyResponseItem {
  return {
    ...item,
    name: item.name ?? '',
    phone: item.phone ?? '',
    answers: parseAnswers(item.answers),
  }
}

function normalizeList(
  raw: SurveyResponseListResult | SurveyResponseItem[] | null | undefined,
): SurveyResponseListResult {
  if (!raw) {
    return { data: [], total: 0, page: 1, limit: 20 }
  }
  if (Array.isArray(raw)) {
    return {
      data: raw.map(normalizeItem),
      total: raw.length,
      page: 1,
      limit: raw.length || 20,
    }
  }
  return {
    data: (raw.data ?? []).map(normalizeItem),
    total: raw.total ?? 0,
    page: raw.page ?? 1,
    limit: raw.limit ?? 20,
  }
}

function normalizeDetail(
  raw: Omit<SurveyResponseDetail, 'answers' | 'questions'> & {
    answers?: unknown
    questions?: unknown
  },
): SurveyResponseDetail {
  return {
    ...raw,
    name: raw.name ?? '',
    phone: raw.phone ?? '',
    answers: parseAnswers(raw.answers),
    questions: parseQuestions(raw.questions),
  }
}

export function listSurveys() {
  return apiRequest<Survey[]>(BASE)
}

export function getSurvey(id: string) {
  return apiRequest<Survey>(`${BASE}/${id}`)
}

export function createSurvey(payload: SurveyPayload) {
  return apiRequest<Survey>(BASE, {
    method: 'POST',
    body: payload,
  })
}

export function updateSurvey(id: string, payload: SurveyPayload) {
  return apiRequest<Survey>(`${BASE}/${id}`, {
    method: 'PUT',
    body: payload,
  })
}

export function deleteSurvey(id: string) {
  return apiRequest<void>(`${BASE}/${id}`, {
    method: 'DELETE',
  })
}

export function publishSurvey(id: string) {
  return apiRequest<Survey>(`${BASE}/${id}/publish`, {
    method: 'POST',
  })
}

export function closeSurvey(id: string) {
  return apiRequest<Survey>(`${BASE}/${id}/close`, {
    method: 'POST',
  })
}

export function getFileFormats() {
  return apiRequest<FileFormats>(`${BASE}/file-formats`)
}

export async function listAllResponses(
  params: SurveyResponseListParams = {},
): Promise<SurveyResponseListResult> {
  const raw = await apiRequest<SurveyResponseListResult | SurveyResponseItem[]>(
    `${BASE}/responses${buildQuery(params)}`,
  )
  return normalizeList(raw)
}

export async function getResponse(responseId: string): Promise<SurveyResponseDetail> {
  const raw = await apiRequest<
    Omit<SurveyResponseDetail, 'answers' | 'questions'> & {
      answers?: unknown
      questions?: unknown
    }
  >(`${BASE}/responses/${encodeURIComponent(responseId)}`)
  return normalizeDetail(raw)
}

export function deleteResponse(responseId: string) {
  return apiRequest<void>(`${BASE}/responses/${encodeURIComponent(responseId)}`, {
    method: 'DELETE',
  })
}

export async function listSurveyResponses(
  id: string,
  params: SurveyResponseListParams = {},
): Promise<SurveyResponseListResult> {
  const raw = await apiRequest<SurveyResponseListResult | SurveyResponseItem[]>(
    `${BASE}/${encodeURIComponent(id)}/responses${buildQuery(params)}`,
  )
  return normalizeList(raw)
}

export function getSurveyResponsesSummary(id: string) {
  return apiRequest<ResponseSummary>(
    `${BASE}/${encodeURIComponent(id)}/responses/summary`,
  )
}

// Public (auth yo'q) — respondent frontend uchun
export function uploadSurveyFile(
  slugOrId: string,
  questionId: string,
  file: File,
) {
  const formData = new FormData()
  formData.append('questionId', questionId)
  formData.append('file', file)
  return apiUpload<SurveyUploadResult>(`/surveys/${slugOrId}/upload`, formData, {
    auth: false,
  })
}
