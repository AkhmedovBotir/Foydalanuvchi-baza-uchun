import { apiRequest, getToken } from './client'
import type { CardTemplate, CardTextField } from './cardTypes'

export function listCardTemplates() {
  return apiRequest<CardTemplate[]>('/card-templates')
}

export function getCardTemplate(id: string) {
  return apiRequest<CardTemplate>(`/card-templates/${id}`)
}

export function deleteCardTemplate(id: string) {
  return apiRequest<void>(`/card-templates/${id}`, { method: 'DELETE' })
}

export function updateCardTemplate(
  id: string,
  body: {
    name?: string
    qrX?: number
    qrY?: number
    qrWidth?: number
    qrHeight?: number
    textFields?: CardTextField[]
  },
) {
  return apiRequest<CardTemplate>(`/card-templates/${id}`, {
    method: 'PUT',
    body,
  })
}

export async function createCardTemplate(form: FormData): Promise<CardTemplate> {
  const token = getToken()
  const res = await fetch('/api/v1/card-templates', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: form,
  })
  const payload = await res.json()
  if (!res.ok || !payload?.success) {
    throw new Error(payload?.message || `Xato (${res.status})`)
  }
  return payload.data as CardTemplate
}

export async function fetchTemplateImageBlob(id: string): Promise<Blob> {
  const token = getToken()
  const res = await fetch(`/api/v1/card-templates/${id}/image`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  if (!res.ok) throw new Error('Rasmni yuklab bo‘lmadi')
  return res.blob()
}
