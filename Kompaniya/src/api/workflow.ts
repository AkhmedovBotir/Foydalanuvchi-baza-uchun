import { apiRequest } from './client'

export type WorkflowDashboard = {
  pending: number
  assigned: number
  paid: number
  noShow: number
  todayPaid: number
  myQueue?: number
  concluded?: number
}

export type WorkflowCase = {
  id: string
  source: string
  sourceId: string
  title: string
  patientName: string
  patientPhone: string
  purpose?: string
  workflowStatus: string
  assignedDoctorId?: string | null
  doctorName?: string
  registratorId?: string | null
  paymentAmount?: number | null
  paymentNote?: string
  paidAt?: string
  conclusion?: string
  concludedAt?: string
  date?: string
  slotStart?: string
  slotEnd?: string
  surveySlug?: string
  answers?: Record<string, unknown>
  referralId?: string | null
  referralName?: string
  referralPhone?: string
  referralSpecialty?: string
  createdAt: string
  updatedAt?: string
}

export type WorkflowListResult = {
  data: WorkflowCase[]
  total: number
  page: number
  limit: number
}

export type AssignPayload = {
  doctorId: string
  paymentAmount?: number
  paymentNote?: string
}

export type PaymentPayload = {
  amount: number
  note?: string
}

export type ConcludePayload = {
  conclusion: string
}

function qs(params: Record<string, string | number | undefined>) {
  const sp = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== '') sp.set(k, String(v))
  })
  const s = sp.toString()
  return s ? `?${s}` : ''
}

const base = '/company/workflow'

export function getWorkflowDashboard() {
  return apiRequest<WorkflowDashboard>(`${base}/dashboard`)
}

export function listWorkflowResponses(
  params: { page?: number; limit?: number; status?: string; doctorId?: string } = {},
) {
  return apiRequest<WorkflowListResult>(`${base}/responses${qs(params)}`)
}

export function listWorkflowBookings(
  params: { page?: number; limit?: number; status?: string; doctorId?: string } = {},
) {
  return apiRequest<WorkflowListResult>(`${base}/bookings${qs(params)}`)
}

export function getWorkflowResponse(id: string) {
  return apiRequest<WorkflowCase>(`${base}/responses/${id}`)
}

export function getWorkflowBooking(id: string) {
  return apiRequest<WorkflowCase>(`${base}/bookings/${id}`)
}

export function assignWorkflowResponse(id: string, body: AssignPayload) {
  return apiRequest<WorkflowCase>(`${base}/responses/${id}/assign`, { method: 'POST', body })
}

export function assignWorkflowBooking(id: string, body: AssignPayload) {
  return apiRequest<WorkflowCase>(`${base}/bookings/${id}/assign`, { method: 'POST', body })
}

export function payWorkflowResponse(id: string, body: PaymentPayload) {
  return apiRequest<WorkflowCase>(`${base}/responses/${id}/payment`, { method: 'POST', body })
}

export function payWorkflowBooking(id: string, body: PaymentPayload) {
  return apiRequest<WorkflowCase>(`${base}/bookings/${id}/payment`, { method: 'POST', body })
}

export function noShowWorkflowResponse(id: string) {
  return apiRequest<WorkflowCase>(`${base}/responses/${id}/no-show`, { method: 'POST' })
}

export function noShowWorkflowBooking(id: string) {
  return apiRequest<WorkflowCase>(`${base}/bookings/${id}/no-show`, { method: 'POST' })
}

export function concludeWorkflowResponse(id: string, body: ConcludePayload) {
  return apiRequest<WorkflowCase>(`${base}/responses/${id}/conclude`, { method: 'POST', body })
}

export function concludeWorkflowBooking(id: string, body: ConcludePayload) {
  return apiRequest<WorkflowCase>(`${base}/bookings/${id}/conclude`, { method: 'POST', body })
}

export function cancelWorkflowResponse(id: string) {
  return apiRequest<WorkflowCase>(`${base}/responses/${id}/cancel`, { method: 'POST' })
}

export function cancelWorkflowBooking(id: string) {
  return apiRequest<WorkflowCase>(`${base}/bookings/${id}/cancel`, { method: 'POST' })
}

export function doctorNoShowWorkflowResponse(id: string) {
  return apiRequest<WorkflowCase>(`${base}/responses/${id}/doctor-no-show`, { method: 'POST' })
}

export function doctorNoShowWorkflowBooking(id: string) {
  return apiRequest<WorkflowCase>(`${base}/bookings/${id}/doctor-no-show`, { method: 'POST' })
}

export const WORKFLOW_STATUS_LABELS: Record<string, string> = {
  pending: 'Kutilmoqda',
  assigned: 'Doktorga yuborilgan',
  paid: 'To‘lov qilingan',
  no_show: 'Kelmagan',
  concluded: 'Xulosa yozilgan',
  cancelled: 'Bekor qilingan',
  doctor_no_show: 'Kirmagan',
}

export const WORKFLOW_STATUS_COLORS: Record<
  string,
  'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'
> = {
  pending: 'warning',
  assigned: 'info',
  paid: 'success',
  no_show: 'error',
  concluded: 'success',
  cancelled: 'default',
  doctor_no_show: 'error',
}
