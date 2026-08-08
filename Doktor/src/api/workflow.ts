import { apiRequest } from './client'
import type { CaseItem, CaseListResult, ConcludePayload, DashboardStats } from './types'

function qs(params: Record<string, string | number | undefined>) {
  const sp = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== '') sp.set(k, String(v))
  })
  const s = sp.toString()
  return s ? `?${s}` : ''
}

export function getDashboard() {
  return apiRequest<DashboardStats>('/doctor/dashboard')
}

export function listResponses(params: { page?: number; limit?: number; status?: string } = {}) {
  return apiRequest<CaseListResult>(`/doctor/responses${qs(params)}`)
}

export function getResponse(id: string) {
  return apiRequest<CaseItem>(`/doctor/responses/${id}`)
}

export function concludeResponse(id: string, body: ConcludePayload) {
  return apiRequest<CaseItem>(`/doctor/responses/${id}/conclude`, {
    method: 'POST',
    body,
  })
}

export function cancelResponse(id: string) {
  return apiRequest<CaseItem>(`/doctor/responses/${id}/cancel`, {
    method: 'POST',
  })
}

export function noShowResponse(id: string) {
  return apiRequest<CaseItem>(`/doctor/responses/${id}/no-show`, {
    method: 'POST',
  })
}

export function listBookings(params: { page?: number; limit?: number; status?: string } = {}) {
  return apiRequest<CaseListResult>(`/doctor/bookings${qs(params)}`)
}

export function getBooking(id: string) {
  return apiRequest<CaseItem>(`/doctor/bookings/${id}`)
}

export function concludeBooking(id: string, body: ConcludePayload) {
  return apiRequest<CaseItem>(`/doctor/bookings/${id}/conclude`, {
    method: 'POST',
    body,
  })
}

export function cancelBooking(id: string) {
  return apiRequest<CaseItem>(`/doctor/bookings/${id}/cancel`, {
    method: 'POST',
  })
}

export function noShowBooking(id: string) {
  return apiRequest<CaseItem>(`/doctor/bookings/${id}/no-show`, {
    method: 'POST',
  })
}
