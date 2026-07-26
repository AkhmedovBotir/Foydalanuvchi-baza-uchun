export type ApiSuccess<T> = {
  success: true
  message: string
  data: T
}

export type ApiErrorBody = {
  success: false
  message: string
  error?: string
}

export type Admin = {
  id: string
  name: string
  phone: string
  username: string
  created_at: string
  updated_at: string
}

export type Company = {
  id: string
  name: string
  phone: string
  username: string
  created_at: string
  updated_at: string
}

export type LoginData = {
  token: string
  admin: Admin
}

export type CreateAdminPayload = {
  name: string
  phone: string
  username: string
  password: string
}

export type UpdateAdminPayload = {
  name: string
  phone: string
  username: string
  password?: string
}

export type CreateCompanyPayload = {
  name: string
  phone: string
  username: string
  password: string
}

export type UpdateCompanyPayload = {
  name: string
  phone: string
  username: string
  password?: string
}

export type LoginPayload = {
  username: string
  password: string
}

export type SurveyLinkSetting = {
  key: string
  base_url: string
  updated_at: string
}

export type UpdateSurveyLinkPayload = {
  base_url: string
}
