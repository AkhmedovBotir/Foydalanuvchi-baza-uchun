/**
 * Frontend API konfiguratsiyasi.
 * Manzilni shu fayldan o‘zgartiring (env ishlatilmaydi).
 */
export const API_ORIGIN = 'https://demo-api.kabul.uz'
export const API_BASE_URL = `${API_ORIGIN}/api/v1`

/** Relativ yoki `/api/v1/...` yo‘lni to‘liq URL ga aylantiradi. */
export function apiUrl(path: string): string {
  if (!path) return API_BASE_URL
  if (/^https?:\/\//i.test(path) || path.startsWith('blob:') || path.startsWith('data:')) {
    return path
  }
  if (path.startsWith('/api/v1')) return `${API_ORIGIN}${path}`
  if (path.startsWith('/api/')) return `${API_ORIGIN}${path}`
  if (path.startsWith('/uploads') || path.startsWith('/files') || path.startsWith('/health')) {
    return `${API_ORIGIN}${path}`
  }
  const normalized = path.startsWith('/') ? path : `/${path}`
  return `${API_BASE_URL}${normalized}`
}
