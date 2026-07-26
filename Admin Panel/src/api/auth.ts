import { apiRequest, setToken } from './client'
import type { Admin, LoginData, LoginPayload, UpdateAdminPayload } from './types'

export async function login(payload: LoginPayload): Promise<LoginData> {
  const data = await apiRequest<LoginData>('/auth/login', {
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
  return apiRequest<Admin>('/auth/profile')
}

export function updateProfile(payload: UpdateAdminPayload) {
  return apiRequest<Admin>('/auth/profile', {
    method: 'PUT',
    body: payload,
  })
}
