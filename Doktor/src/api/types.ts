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

export type LoginPayload = {
  username: string
  password: string
}

export type StaffUser = {
  id: string
  companyId: string
  name: string
  phone: string
  username: string
  specialty?: string
  createdAt: string
  updatedAt: string
}

export type LoginResult = {
  token: string
  doctor: StaffUser
}

export type DashboardStats = {
  pending: number
  assigned: number
  paid: number
  todayPaid: number
  myQueue: number
  concluded: number
  noShow: number
}

export type CaseItem = {
  id: string
  source: string
  sourceId: string
  title: string
  patientName: string
  patientPhone: string
  purpose?: string
  workflowStatus: string
  assignedDoctorId?: string | null
  doctorName?: string
  registratorId?: string | null
  paymentAmount?: number | null
  paymentNote?: string
  paidAt?: string
  conclusion?: string
  concludedAt?: string
  date?: string
  slotStart?: string
  slotEnd?: string
  surveySlug?: string
  answers?: Record<string, unknown>
  referralId?: string | null
  referralName?: string
  referralPhone?: string
  referralSpecialty?: string
  createdAt: string
  updatedAt?: string
}

export type CaseListResult = {
  data: CaseItem[]
  total: number
  page: number
  limit: number
}

export type ConcludePayload = {
  conclusion: string
}
