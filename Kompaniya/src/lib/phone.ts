/** O‘zbek mobil: +998 90 123 45 67 */

export function phoneDigitsOnly(value: string): string {
  return (value || '').replace(/\D/g, '')
}

/** 9 raqamli milliy qism (90xxxxxxx) */
export function extractUzLocalDigits(value: string): string {
  let d = phoneDigitsOnly(value)
  if (d.startsWith('998')) d = d.slice(3)
  if (d.startsWith('0')) d = d.slice(1)
  return d.slice(0, 9)
}

/** Input ko‘rinishi: 90 123 45 67 */
export function formatUzPhoneMask(value: string): string {
  const d = extractUzLocalDigits(value)
  const a = d.slice(0, 2)
  const b = d.slice(2, 5)
  const c = d.slice(5, 7)
  const e = d.slice(7, 9)
  return [a, b, c, e].filter(Boolean).join(' ')
}

/** API / saqlash: +998901234567 yoki bo‘sh */
export function toUzPhoneE164(value: string): string {
  const d = extractUzLocalDigits(value)
  if (!d) return ''
  return `+998${d}`
}

export function isValidUzPhone(value: string): boolean {
  return extractUzLocalDigits(value).length === 9
}

/** Ro‘yxatda ko‘rsatish */
export function displayUzPhone(value: string): string {
  const d = extractUzLocalDigits(value)
  if (!d) return value || '—'
  const masked = formatUzPhoneMask(d)
  return `+998 ${masked}`
}
