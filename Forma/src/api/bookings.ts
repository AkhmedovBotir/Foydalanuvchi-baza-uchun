import type {
  ApiResponse,
  BookingResult,
  DayAvailability,
  PublicAppointment,
  SlotItem,
} from '../types/booking'

const API_BASE =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') ||
  'http://localhost:8080/api/v1'

async function parseJson<T>(res: Response): Promise<T> {
  const body = (await res.json().catch(() => null)) as
    | ApiResponse<T>
    | { message?: string; error?: string }
    | null

  if (!res.ok) {
    const message =
      (body && 'message' in body && body.message) ||
      (body && 'error' in body && body.error) ||
      `So‘rov xatosi (${res.status})`
    throw new Error(String(message))
  }

  if (body && typeof body === 'object' && 'data' in body) {
    return (body as ApiResponse<T>).data
  }

  return body as T
}

export async function getBookingService(slug: string): Promise<PublicAppointment> {
  const res = await fetch(`${API_BASE}/bookings/${encodeURIComponent(slug)}`)
  return parseJson<PublicAppointment>(res)
}

export async function getAvailableDays(
  slug: string,
  from: string,
  to: string,
): Promise<DayAvailability[]> {
  const q = new URLSearchParams({ from, to })
  const res = await fetch(
    `${API_BASE}/bookings/${encodeURIComponent(slug)}/days?${q}`,
  )
  return parseJson<DayAvailability[]>(res)
}

export async function getAvailableSlots(
  slug: string,
  date: string,
): Promise<SlotItem[]> {
  const q = new URLSearchParams({ date })
  const res = await fetch(
    `${API_BASE}/bookings/${encodeURIComponent(slug)}/slots?${q}`,
  )
  return parseJson<SlotItem[]>(res)
}

export async function createBooking(
  slug: string,
  body: {
    date: string
    slotStart: string
    name: string
    phone: string
    purpose?: string
  },
): Promise<BookingResult> {
  const res = await fetch(`${API_BASE}/bookings/${encodeURIComponent(slug)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return parseJson<BookingResult>(res)
}
