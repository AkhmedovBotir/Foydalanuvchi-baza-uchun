import { apiRequest, getToken } from './client'
import { apiUrl } from '../config/api'
import type {
  CardBrief,
  CardLayout,
  CardTemplate,
  CardTextField,
  CompanyCard,
} from './cardTypes'

function authHeaders(): HeadersInit {
  const token = getToken()
  return {
    Accept: 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

export function listCardTemplates() {
  return apiRequest<CardTemplate[]>('/company/card-templates')
}

export function getCardTemplate(id: string) {
  return apiRequest<CardTemplate>(`/company/card-templates/${id}`)
}

export function listCards() {
  return apiRequest<CompanyCard[]>('/company/cards')
}

export function getCard(id: string) {
  return apiRequest<CompanyCard>(`/company/cards/${id}`)
}

export function createFromTemplate(body: {
  templateId: string
  name?: string
  textFields?: CardTextField[]
}) {
  return apiRequest<CompanyCard>('/company/cards/from-template', {
    method: 'POST',
    body,
  })
}

export async function createCustomCard(form: FormData): Promise<CompanyCard> {
  const res = await fetch(apiUrl('/company/cards'), {
    method: 'POST',
    headers: authHeaders(),
    body: form,
  })
  const payload = await res.json()
  if (!res.ok || !payload?.success) {
    throw new Error(payload?.message || `Xato (${res.status})`)
  }
  return payload.data as CompanyCard
}

export function updateCard(
  id: string,
  body: {
    name?: string
    qrX?: number
    qrY?: number
    qrWidth?: number
    qrHeight?: number
    textFields?: CardTextField[]
    orientation?: string
    cols?: number
    rows?: number
  },
) {
  return apiRequest<CompanyCard>(`/company/cards/${id}`, {
    method: 'PUT',
    body,
  })
}

export function deleteCard(id: string) {
  return apiRequest<void>(`/company/cards/${id}`, { method: 'DELETE' })
}

export function getCardLayout(id: string) {
  return apiRequest<CardLayout>(`/company/cards/${id}/layout`)
}

export async function fetchCardBlob(path: string): Promise<Blob> {
  const res = await fetch(apiUrl(path), {
    headers: authHeaders(),
  })
  if (!res.ok) throw new Error('Yuklab bo‘lmadi')
  return res.blob()
}

export async function downloadCardPdf(id: string, copies?: number) {
  const q = copies ? `?copies=${copies}` : ''
  const res = await fetch(apiUrl(`/company/cards/${id}/pdf${q}`), {
    headers: authHeaders(),
  })
  if (!res.ok) {
    const payload = await res.json().catch(() => null)
    throw new Error(payload?.message || 'PDF olinmadi')
  }
  return res.blob()
}

export function attachCardToSurvey(surveyId: string, cardId: string) {
  return apiRequest<CompanyCard>(`/company/surveys/${encodeURIComponent(surveyId)}/card`, {
    method: 'POST',
    body: { cardId },
  })
}

export function detachCardFromSurvey(surveyId: string) {
  return apiRequest<void>(`/company/surveys/${encodeURIComponent(surveyId)}/card`, {
    method: 'DELETE',
  })
}

export function getSurveyCard(surveyId: string) {
  return apiRequest<CardBrief | null>(
    `/company/surveys/${encodeURIComponent(surveyId)}/card`,
  )
}
