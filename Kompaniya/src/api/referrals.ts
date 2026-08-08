import { apiRequest } from './client'

export type Referral = {
  id: string
  companyId: string
  name: string
  phone: string
  specialty: string
  serviceId?: string | null
  serviceSlug?: string
  serviceTitle?: string
  cardId?: string | null
  bookingUrl?: string
  createdAt: string
  updatedAt: string
}

export type ReferralPayload = {
  name: string
  phone: string
  specialty: string
  serviceId?: string
}

export function listReferrals() {
  return apiRequest<Referral[]>('/company/referrals')
}

export function createReferral(body: ReferralPayload) {
  return apiRequest<Referral>('/company/referrals', { method: 'POST', body })
}

export function updateReferral(id: string, body: ReferralPayload) {
  return apiRequest<Referral>(`/company/referrals/${id}`, { method: 'PUT', body })
}

export function deleteReferral(id: string) {
  return apiRequest<void>(`/company/referrals/${id}`, { method: 'DELETE' })
}

export function attachCardToReferral(id: string, cardId: string, serviceId?: string) {
  return apiRequest<Referral>(`/company/referrals/${id}/card`, {
    method: 'POST',
    body: { cardId, serviceId },
  })
}

export function detachCardFromReferral(id: string) {
  return apiRequest<Referral>(`/company/referrals/${id}/card`, { method: 'DELETE' })
}
