import type { ApiErrorBody, ApiSuccess } from './types'
import { apiUrl } from './config'

const TOKEN_KEY = 'company_token'

export class ApiError extends Error {
  status: number
  detail?: string

  constructor(message: string, status: number, detail?: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.detail = detail
  }
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token)
  else localStorage.removeItem(TOKEN_KEY)
}

type RequestOptions = {
  method?: string
  body?: unknown
  auth?: boolean
}

export async function apiRequest<T>(
  path: string,
  { method = 'GET', body, auth = true }: RequestOptions = {},
): Promise<T> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
  }

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
  }

  if (auth) {
    const token = getToken()
    if (!token) {
      throw new ApiError('Avtorizatsiya talab qilinadi', 401)
    }
    headers.Authorization = `Bearer ${token}`
  }

  const res = await fetch(apiUrl(path), {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  })

  let payload: ApiSuccess<T> | ApiErrorBody | null = null
  try {
    payload = (await res.json()) as ApiSuccess<T> | ApiErrorBody
  } catch {
    payload = null
  }

  if (!res.ok || !payload || payload.success === false) {
    const message =
      payload && 'message' in payload
        ? payload.message
        : `So‘rov muvaffaqiyatsiz (${res.status})`
    const detail =
      payload && 'error' in payload && payload.error ? payload.error : undefined

    if (res.status === 401 && auth) {
      setToken(null)
    }

    throw new ApiError(message, res.status, detail)
  }

  return payload.data
}

export async function apiUpload<T>(
  path: string,
  formData: FormData,
  { auth = true }: { auth?: boolean } = {},
): Promise<T> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
  }

  if (auth) {
    const token = getToken()
    if (!token) {
      throw new ApiError('Avtorizatsiya talab qilinadi', 401)
    }
    headers.Authorization = `Bearer ${token}`
  }

  const res = await fetch(apiUrl(path), {
    method: 'POST',
    headers,
    body: formData,
  })

  let payload: ApiSuccess<T> | ApiErrorBody | null = null
  try {
    payload = (await res.json()) as ApiSuccess<T> | ApiErrorBody
  } catch {
    payload = null
  }

  if (!res.ok || !payload || payload.success === false) {
    const message =
      payload && 'message' in payload
        ? payload.message
        : `So‘rov muvaffaqiyatsiz (${res.status})`
    const detail =
      payload && 'error' in payload && payload.error ? payload.error : undefined

    if (res.status === 401 && auth) {
      setToken(null)
    }

    throw new ApiError(message, res.status, detail)
  }

  return payload.data
}
