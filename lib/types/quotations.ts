export interface QuotationListItem {
  id: string
  number: string
  client_name: string
  project_name: string | null
  status: 'draft' | 'sent' | 'approved' | 'rejected'
  grand_total: number
  created_at: string
}

export interface QuotationDetail {
  id: string
  number: string
  status: 'draft' | 'sent' | 'approved' | 'rejected'
  discount_amount: number
  tax_percentage: number
  notes: string | null
  valid_until: string | null
  created_at: string
  approved_at: string | null
  rejected_at: string | null
  sent_at: string | null
  project_id: string | null
  clients: { company_name: string } | null
  projects: { name: string; location: string | null } | null
}

export interface QuotationItemDetail {
  id: string
  duration: number
  rate_snapshot: number
  rate_type: 'hourly' | 'daily'
  subtotal: number
  units: {
    id: string
    code: string
    name: string
    category: string
  } | null
}

export interface CreateQuotationInput {
  clientId: string
  projectId?: string
  items: {
    unitId: string
    pricelistId: string
    rateType: string
    rateSnapshot: number
    duration: number
  }[]
  discountAmount: number
  taxPercentage: number
  notes?: string
  validUntil?: string
}

export interface QuotationProjectOption {
  id: string
  name: string
  client_id: string
}

export interface QuotationUnitOption {
  id: string
  code: string
  name: string
  category: string
}

export interface QuotationPricelistOption {
  id: string
  unit_id: string
  rate_type: 'hourly' | 'daily'
  rate_amount: number
}

export type QuotationActionState = {
  error?: string
  success?: boolean
  id?: string
} | null
