export const STATUS_LABELS: Record<string, string> = {
  pending: 'Kutilmoqda',
  assigned: 'Doktorga yuborilgan',
  paid: 'To‘lov qilingan',
  no_show: 'Kelmagan',
  concluded: 'Xulosa yozilgan',
  cancelled: 'Bekor qilingan',
  doctor_no_show: 'Kirmagan',
}

export const STATUS_COLORS: Record<
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

export function formatMoney(n?: number | null) {
  if (n == null) return '—'
  return new Intl.NumberFormat('uz-UZ').format(n) + ' so‘m'
}

export function formatDateTime(iso?: string) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString('uz-UZ', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
