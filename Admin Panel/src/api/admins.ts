import { apiRequest } from './client'
import type { Admin, CreateAdminPayload, UpdateAdminPayload } from './types'

export function listAdmins() {
  return apiRequest<Admin[]>('/admins')
}

export function getAdmin(id: string) {
  return apiRequest<Admin>(`/admins/${id}`)
}

export function createAdmin(payload: CreateAdminPayload) {
  return apiRequest<Admin>('/admins', {
    method: 'POST',
    body: payload,
  })
}

export function updateAdmin(id: string, payload: UpdateAdminPayload) {
  return apiRequest<Admin>(`/admins/${id}`, {
    method: 'PUT',
    body: payload,
  })
}

export function deleteAdmin(id: string) {
  return apiRequest<void>(`/admins/${id}`, {
    method: 'DELETE',
  })
}
