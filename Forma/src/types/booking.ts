export type DaySchedule = {
  weekday: number
  enabled: boolean
  start: string
  end: string
}

export type PublicAppointment = {
  id: string
  slug: string
  title: string
  description: string
  status: string
  slotIntervalMinutes: number
  schedule: DaySchedule[]
  maxDaysAhead: number
}

export type DayAvailability = {
  date: string
  weekday: number
  open: boolean
  totalSlots: number
  freeSlots: number
}

export type SlotItem = {
  start: string
  end: string
  available: boolean
}

export type BookingResult = {
  id: string
  date: string
  slotStart: string
  slotEnd: string
  name: string
  phone: string
  purpose: string
  status: string
}

export type ApiResponse<T> = {
  success: boolean
  message: string
  data: T
}
