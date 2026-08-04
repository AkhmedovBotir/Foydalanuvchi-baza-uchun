import { apiRequest } from './client'
import type {
  AppointmentBooking,
  AppointmentService,
  BookingListResult,
  BookingSummary,
  UpsertAppointmentPayload,
} from './appointmentTypes'

export function listAppointments() {
  return apiRequest<AppointmentService[]>('/company/appointments')
}

export function getAppointment(id: string) {
  return apiRequest<AppointmentService>(`/company/appointments/${id}`)
}

export function createAppointment(body: UpsertAppointmentPayload) {
  return apiRequest<AppointmentService>('/company/appointments', {
    method: 'POST',
    body,
  })
}

export function updateAppointment(id: string, body: UpsertAppointmentPayload) {
  return apiRequest<AppointmentService>(`/company/appointments/${id}`, {
    method: 'PUT',
    body,
  })
}

export function deleteAppointment(id: string) {
  return apiRequest<void>(`/company/appointments/${id}`, { method: 'DELETE' })
}

export function publishAppointment(id: string) {
  return apiRequest<AppointmentService>(`/company/appointments/${id}/publish`, {
    method: 'POST',
  })
}

export function closeAppointment(id: string) {
  return apiRequest<AppointmentService>(`/company/appointments/${id}/close`, {
    method: 'POST',
  })
}

export function attachCardToAppointment(id: string, cardId: string) {
  return apiRequest<AppointmentService>(`/company/appointments/${id}/card`, {
    method: 'POST',
    body: { cardId },
  })
}

export function detachCardFromAppointment(id: string) {
  return apiRequest<AppointmentService>(`/company/appointments/${id}/card`, {
    method: 'DELETE',
  })
}

export function listBookings(params?: {
  page?: number
  limit?: number
  service?: string
  status?: string
}) {
  const q = new URLSearchParams()
  if (params?.page) q.set('page', String(params.page))
  if (params?.limit) q.set('limit', String(params.limit))
  if (params?.service) q.set('service', params.service)
  if (params?.status) q.set('status', params.status)
  const qs = q.toString()
  return apiRequest<BookingListResult>(
    `/company/appointments/bookings${qs ? `?${qs}` : ''}`,
  )
}

export function getBooking(id: string) {
  return apiRequest<AppointmentBooking>(
    `/company/appointments/bookings/${id}`,
  )
}

export function updateBooking(
  id: string,
  body: { status?: string; conclusion?: string },
) {
  return apiRequest<AppointmentBooking>(
    `/company/appointments/bookings/${id}`,
    { method: 'PATCH', body },
  )
}

export function getBookingSummary(service?: string) {
  const qs = service ? `?service=${encodeURIComponent(service)}` : ''
  return apiRequest<BookingSummary>(`/company/appointments/summary${qs}`)
}
