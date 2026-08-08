import type {
  ApiResponse,
  SubmitPayload,
  SubmitResult,
  SurveyForm,
  UploadResult,
} from '../types/survey'
import { API_BASE_URL } from '../config/api'

const API_BASE = API_BASE_URL

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

export async function getForm(slug: string): Promise<SurveyForm> {
  const res = await fetch(`${API_BASE}/forms/${encodeURIComponent(slug)}`)
  return parseJson<SurveyForm>(res)
}

export async function submitForm(
  slug: string,
  payload: SubmitPayload,
): Promise<SubmitResult> {
  const res = await fetch(`${API_BASE}/forms/${encodeURIComponent(slug)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  return parseJson<SubmitResult>(res)
}

export function uploadFormFile(
  slug: string,
  questionId: string,
  file: File,
  onProgress?: (percent: number) => void,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    const form = new FormData()
    form.append('questionId', questionId)
    form.append('file', file)

    xhr.open(
      'POST',
      `${API_BASE}/forms/${encodeURIComponent(slug)}/upload`,
    )

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) {
        onProgress?.(30)
        return
      }
      onProgress?.(Math.min(99, Math.round((event.loaded / event.total) * 100)))
    }

    xhr.onload = () => {
      try {
        const body = JSON.parse(xhr.responseText || '{}') as
          | ApiResponse<UploadResult>
          | { message?: string; error?: string }

        if (xhr.status < 200 || xhr.status >= 300) {
          const message =
            ('message' in body && body.message) ||
            ('error' in body && body.error) ||
            `Yuklash xatosi (${xhr.status})`
          reject(new Error(String(message)))
          return
        }

        const data =
          body && typeof body === 'object' && 'data' in body
            ? (body as ApiResponse<UploadResult>).data
            : (body as UploadResult)

        const path = data?.path || data?.url
        if (!path) {
          reject(new Error('Fayl yuklandi, lekin path qaytmadi'))
          return
        }
        onProgress?.(100)
        resolve(path)
      } catch {
        reject(new Error('Server javobini o‘qib bo‘lmadi'))
      }
    }

    xhr.onerror = () => reject(new Error('Tarmoq xatosi — fayl yuklanmadi'))
    xhr.onabort = () => reject(new Error('Yuklash bekor qilindi'))
    xhr.send(form)
  })
}
