import { apiRequest, setToken } from './client'
import type { Company, LoginData, LoginPayload, UpdateCompanyPayload } from './types'

export async function login(payload: LoginPayload): Promise<LoginData> {
  const data = await apiRequest<LoginData>('/company/auth/login', {
    method: 'POST',
    body: payload,
    auth: false,
  })
  setToken(data.token)
  return data
}

export function logout() {
  setToken(null)
}

export function getProfile() {
  return apiRequest<Company>('/company/auth/profile')
}

export function updateProfile(payload: UpdateCompanyPayload) {
  return apiRequest<Company>('/company/auth/profile', {
    method: 'PUT',
    body: payload,
  })
}
