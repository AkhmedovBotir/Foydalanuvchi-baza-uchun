import { apiRequest } from './client'

export type SchemeLine = {
  id: string
  label: string
  pct: number
  role: string
  onlyIfReferral?: boolean
  doctorId?: string
  referralId?: string
  children?: SchemeLine[]
}

export type SchemeDoctor = { doctorId: string; doctorName?: string; pct: number }
export type SchemeReferral = { referralId: string; referralName?: string; pct: number }

export type FinanceScheme = {
  id: string
  companyId: string
  name: string
  description: string
  lines: SchemeLine[]
  workerPct: number
  adsPct: number
  doctorPct: number
  ownerPct: number
  referralPct: number
  ownerSalesPct: number
  ownerDepositPct: number
  isActive: boolean
  doctors: SchemeDoctor[]
  referrals: SchemeReferral[]
  createdAt: string
  updatedAt: string
}

export type UpsertSchemePayload = {
  name: string
  description?: string
  lines: SchemeLine[]
  isActive?: boolean
  // legacy optional fallbacks
  workerPct?: number
  adsPct?: number
  doctorPct?: number
  ownerPct?: number
  referralPct?: number
  ownerSalesPct?: number
  ownerDepositPct?: number
  doctors?: SchemeDoctor[]
  referrals?: SchemeReferral[]
}

export type FinanceSummary = {
  todayIncome: number
  todayPending: number
  todayPaidOut: number
  pendingTotal: number
  paidOutTotal: number
  workerPending: number
  adsPending: number
  doctorPending: number
  ownerPending: number
  referralPending: number
}

export type FinanceIncome = {
  id: string
  schemeId?: string | null
  schemeName?: string
  source: string
  sourceId: string
  amount: number
  hasReferral: boolean
  referralId?: string | null
  referralName?: string
  doctorId?: string | null
  doctorName?: string
  patientName: string
  patientPhone: string
  note: string
  paidAt: string
  createdAt: string
}

export type FinanceAllocation = {
  id: string
  incomeId: string
  category: string
  beneficiaryType: string
  beneficiaryId?: string | null
  beneficiaryName: string
  amount: number
  status: string
  payoutNote: string
  paidOutAt?: string
  patientName?: string
  source?: string
  incomeAmount?: number
  paidAt?: string
  createdAt: string
}

export type ListResult<T> = {
  data: T[]
  total: number
  page: number
  limit: number
}

export function getFinanceSummary() {
  return apiRequest<FinanceSummary>('/company/finance/summary')
}

export function listSchemes() {
  return apiRequest<FinanceScheme[]>('/company/finance/schemes')
}

export function getScheme(id: string) {
  return apiRequest<FinanceScheme>(`/company/finance/schemes/${id}`)
}

export function createScheme(body: UpsertSchemePayload) {
  return apiRequest<FinanceScheme>('/company/finance/schemes', { method: 'POST', body })
}

export function updateScheme(id: string, body: UpsertSchemePayload) {
  return apiRequest<FinanceScheme>(`/company/finance/schemes/${id}`, { method: 'PUT', body })
}

export function deleteScheme(id: string) {
  return apiRequest<void>(`/company/finance/schemes/${id}`, { method: 'DELETE' })
}

export function listIncomes(params: { date?: string; page?: number; limit?: number } = {}) {
  const sp = new URLSearchParams()
  if (params.date) sp.set('date', params.date)
  if (params.page) sp.set('page', String(params.page))
  if (params.limit) sp.set('limit', String(params.limit))
  const q = sp.toString()
  return apiRequest<ListResult<FinanceIncome>>(`/company/finance/incomes${q ? `?${q}` : ''}`)
}

export function listAllocations(
  params: { status?: string; category?: string; date?: string; page?: number; limit?: number } = {},
) {
  const sp = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== '') sp.set(k, String(v))
  })
  const q = sp.toString()
  return apiRequest<ListResult<FinanceAllocation>>(
    `/company/finance/allocations${q ? `?${q}` : ''}`,
  )
}

export function payAllocation(id: string, note?: string) {
  return apiRequest<void>(`/company/finance/allocations/${id}/pay`, {
    method: 'POST',
    body: { note: note || '' },
  })
}

export function payBatch(ids: string[], note?: string) {
  return apiRequest<{ count: number }>('/company/finance/allocations/pay-batch', {
    method: 'POST',
    body: { ids, note: note || '' },
  })
}

export const CATEGORY_LABELS: Record<string, string> = {
  worker: 'Ishchi',
  ads: 'Reklama',
  doctor: 'Shifokor',
  owner_sales: 'Savdo (bank)',
  owner_deposit: 'Omonat',
  referral: 'Referal',
  residual: 'Qoldiq',
  custom: 'Boshqa',
}

export const ROLE_OPTIONS: { value: string; label: string }[] = [
  { value: 'custom', label: 'Oddiy / boshqa' },
  { value: 'worker', label: 'Ishchi' },
  { value: 'ads', label: 'Reklama' },
  { value: 'doctor', label: 'Shifokor (pool)' },
  { value: 'owner', label: 'Biznes egasi' },
  { value: 'referral', label: 'Referal' },
  { value: 'owner_sales', label: 'Savdo (bank)' },
  { value: 'owner_deposit', label: 'Omonat' },
]

export function newLineId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `ln-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export function defaultSchemeLines(): SchemeLine[] {
  return [
    { id: newLineId(), label: 'Ishchi', pct: 20, role: 'worker', children: [] },
    { id: newLineId(), label: 'Reklama', pct: 10, role: 'ads', children: [] },
    { id: newLineId(), label: 'Shifokor', pct: 30, role: 'doctor', children: [] },
    {
      id: newLineId(),
      label: 'Biznes egasi',
      pct: 30,
      role: 'owner',
      children: [
        { id: newLineId(), label: 'Savdo (bank)', pct: 60, role: 'owner_sales', children: [] },
        { id: newLineId(), label: 'Omonat', pct: 40, role: 'owner_deposit', children: [] },
      ],
    },
    {
      id: newLineId(),
      label: 'Referal',
      pct: 10,
      role: 'referral',
      onlyIfReferral: true,
      children: [],
    },
  ]
}

export function sumPct(lines?: SchemeLine[]) {
  return (lines || []).reduce((s, l) => s + (Number(l.pct) || 0), 0)
}
