import { apiRequest } from './client'

export type Registrator = {
  id: string
  companyId: string
  name: string
  phone: string
  username: string
  createdAt: string
  updatedAt: string
}

export type Doctor = {
  id: string
  companyId: string
  name: string
  specialty: string
  phone: string
  username: string
  createdAt: string
  updatedAt: string
}

export type RegistratorPayload = {
  name: string
  phone: string
  username: string
  password?: string
}

export type DoctorPayload = {
  name: string
  specialty: string
  phone: string
  username: string
  password?: string
}

// Registrators

export function listRegistrators() {
  return apiRequest<Registrator[]>('/company/registrators')
}

export function createRegistrator(body: Required<RegistratorPayload>) {
  return apiRequest<Registrator>('/company/registrators', {
    method: 'POST',
    body,
  })
}

export function updateRegistrator(id: string, body: RegistratorPayload) {
  return apiRequest<Registrator>(`/company/registrators/${id}`, {
    method: 'PUT',
    body,
  })
}

export function deleteRegistrator(id: string) {
  return apiRequest<void>(`/company/registrators/${id}`, { method: 'DELETE' })
}

// Doctors

export function listDoctors() {
  return apiRequest<Doctor[]>('/company/doctors')
}

export function createDoctor(body: Required<DoctorPayload>) {
  return apiRequest<Doctor>('/company/doctors', {
    method: 'POST',
    body,
  })
}

export function updateDoctor(id: string, body: DoctorPayload) {
  return apiRequest<Doctor>(`/company/doctors/${id}`, {
    method: 'PUT',
    body,
  })
}

export function deleteDoctor(id: string) {
  return apiRequest<void>(`/company/doctors/${id}`, { method: 'DELETE' })
}
