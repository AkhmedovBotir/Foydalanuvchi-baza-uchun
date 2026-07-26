import { apiRequest } from './client'
import type { Company, CreateCompanyPayload, UpdateCompanyPayload } from './types'

export function listCompanies() {
  return apiRequest<Company[]>('/companies')
}

export function getCompany(id: string) {
  return apiRequest<Company>(`/companies/${id}`)
}

export function createCompany(payload: CreateCompanyPayload) {
  return apiRequest<Company>('/companies', {
    method: 'POST',
    body: payload,
  })
}

export function updateCompany(id: string, payload: UpdateCompanyPayload) {
  return apiRequest<Company>(`/companies/${id}`, {
    method: 'PUT',
    body: payload,
  })
}

export function deleteCompany(id: string) {
  return apiRequest<void>(`/companies/${id}`, {
    method: 'DELETE',
  })
}
