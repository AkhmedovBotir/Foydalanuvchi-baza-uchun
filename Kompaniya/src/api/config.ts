/** Production / demo API */
const DEFAULT_API_BASE = 'https://demo-api.ttsa.uz/api/v1'

export const API_BASE = (
  import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE
).replace(/\/$/, '')

/** Origin (uploads, health) — API_BASE dan /api/v1 olib tashlanadi */
export const API_ORIGIN = API_BASE.replace(/\/api\/v1$/i, '') || 'https://demo-api.ttsa.uz'

/**
 * Relativ yo‘lni to‘liq API URL ga aylantiradi.
 * Misol: `/company/x` yoki `/api/v1/company/x` → `https://demo-api.ttsa.uz/api/v1/company/x`
 */
export function apiUrl(path: string): string {
  if (!path) return API_BASE
  if (/^https?:\/\//i.test(path) || path.startsWith('blob:') || path.startsWith('data:')) {
    return path
  }

  let p = path.trim()
  if (p.startsWith('/api/v1')) p = p.slice('/api/v1'.length)
  else if (p.startsWith('api/v1')) p = p.slice('api/v1'.length)

  if (p.startsWith('/uploads') || p.startsWith('/files') || p.startsWith('/health')) {
    return `${API_ORIGIN}${p}`
  }
  if (p.startsWith('uploads/') || p.startsWith('files/')) {
    return `${API_ORIGIN}/${p}`
  }

  if (!p.startsWith('/')) p = `/${p}`
  return `${API_BASE}${p}`
}
