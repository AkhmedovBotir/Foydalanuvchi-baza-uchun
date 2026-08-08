import { apiRequest } from './client'
import type {
  AssignPayload,
  CaseItem,
  CaseListResult,
  DashboardStats,
  DoctorBrief,
  PaymentPayload,
} from './types'

function qs(params: Record<string, string | number | undefined>) {
  const sp = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== '') sp.set(k, String(v))
  })
  const s = sp.toString()
  return s ? `?${s}` : ''
}

export function getDashboard() {
  return apiRequest<DashboardStats>('/registrator/dashboard')
}

export function listDoctors() {
  return apiRequest<DoctorBrief[]>('/registrator/doctors')
}

export function listResponses(params: { page?: number; limit?: number; status?: string } = {}) {
  return apiRequest<CaseListResult>(`/registrator/responses${qs(params)}`)
}

export function getResponse(id: string) {
  return apiRequest<CaseItem>(`/registrator/responses/${id}`)
}

export function assignResponse(id: string, body: AssignPayload) {
  return apiRequest<CaseItem>(`/registrator/responses/${id}/assign`, {
    method: 'POST',
    body,
  })
}

export function payResponse(id: string, body: PaymentPayload) {
  return apiRequest<CaseItem>(`/registrator/responses/${id}/payment`, {
    method: 'POST',
    body,
  })
}

export function noShowResponse(id: string) {
  return apiRequest<CaseItem>(`/registrator/responses/${id}/no-show`, {
    method: 'POST',
  })
}

export function listBookings(params: { page?: number; limit?: number; status?: string } = {}) {
  return apiRequest<CaseListResult>(`/registrator/bookings${qs(params)}`)
}

export function getBooking(id: string) {
  return apiRequest<CaseItem>(`/registrator/bookings/${id}`)
}

export function assignBooking(id: string, body: AssignPayload) {
  return apiRequest<CaseItem>(`/registrator/bookings/${id}/assign`, {
    method: 'POST',
    body,
  })
}

export function payBooking(id: string, body: PaymentPayload) {
  return apiRequest<CaseItem>(`/registrator/bookings/${id}/payment`, {
    method: 'POST',
    body,
  })
}

export function noShowBooking(id: string) {
  return apiRequest<CaseItem>(`/registrator/bookings/${id}/no-show`, {
    method: 'POST',
  })
}
