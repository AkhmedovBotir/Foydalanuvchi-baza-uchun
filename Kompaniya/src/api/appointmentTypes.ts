export type DaySchedule = {
  weekday: number // 1=Mon … 7=Sun
  enabled: boolean
  start: string
  end: string
}

export type AppointmentStatus = 'draft' | 'published' | 'closed'

export type AppointmentService = {
  id: string
  companyId: string
  slug: string
  title: string
  description: string
  status: AppointmentStatus
  slotIntervalMinutes: number
  schedule: DaySchedule[]
  maxDaysAhead: number
  cardId?: string | null
  bookingUrl?: string
  createdAt: string
  updatedAt: string
  publishedAt?: string
  closedAt?: string
}

export type UpsertAppointmentPayload = {
  slug: string
  title: string
  description?: string
  slotIntervalMinutes: number
  schedule: DaySchedule[]
  maxDaysAhead?: number
}

export type BookingStatus =
  | 'pending'
  | 'confirmed'
  | 'completed'
  | 'cancelled'
  | 'no_show'

export type AppointmentBooking = {
  id: string
  serviceId: string
  serviceSlug?: string
  serviceTitle?: string
  date: string
  slotStart: string
  slotEnd: string
  name: string
  phone: string
  purpose: string
  status: BookingStatus
  conclusion: string
  concludedAt?: string
  createdAt: string
  updatedAt: string
}

export type BookingListResult = {
  data: AppointmentBooking[]
  total: number
  page: number
  limit: number
}

export type BookingSummary = {
  serviceId: string
  total: number
  pending: number
  confirmed: number
  completed: number
  cancelled: number
  today: number
  thisWeek: number
}

export const WEEKDAY_LABELS: Record<number, string> = {
  1: 'Dushanba',
  2: 'Seshanba',
  3: 'Chorshanba',
  4: 'Payshanba',
  5: 'Juma',
  6: 'Shanba',
  7: 'Yakshanba',
}

export function defaultSchedule(): DaySchedule[] {
  return [1, 2, 3, 4, 5, 6, 7].map((weekday) => ({
    weekday,
    enabled: weekday <= 5,
    start: '09:00',
    end: '18:00',
  }))
}

export const BOOKING_STATUS_META: Record<
  BookingStatus,
  { label: string; color: string; bg: string }
> = {
  pending: { label: 'Kutilmoqda', color: '#b45309', bg: '#fef3c7' },
  confirmed: { label: 'Tasdiqlangan', color: '#1d4ed8', bg: '#dbeafe' },
  completed: { label: 'Yakunlangan', color: '#047857', bg: '#d1fae5' },
  cancelled: { label: 'Bekor', color: '#b91c1c', bg: '#fee2e2' },
  no_show: { label: 'Kelmagan', color: '#6b7280', bg: '#f3f4f6' },
}

export const APPOINTMENT_STATUS_META: Record<
  AppointmentStatus,
  { label: string; color: string; bg: string }
> = {
  draft: { label: 'Loyiha', color: '#6b7280', bg: '#f3f4f6' },
  published: { label: 'Nashr', color: '#047857', bg: '#d1fae5' },
  closed: { label: 'Yopiq', color: '#b91c1c', bg: '#fee2e2' },
}
