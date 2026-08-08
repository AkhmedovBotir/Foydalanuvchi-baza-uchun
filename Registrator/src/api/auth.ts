import { apiRequest, setToken } from './client'
import type { LoginPayload, LoginResult, StaffUser } from './types'

export async function login(payload: LoginPayload): Promise<LoginResult> {
  const data = await apiRequest<LoginResult>('/registrator/auth/login', {
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
  return apiRequest<StaffUser>('/registrator/auth/profile')
}
