export interface Project {
  id: string
  name: string
  location: string | null
  status: 'draft' | 'active' | 'completed' | 'cancelled'
  start_date: string | null
  end_date: string | null
  description: string | null
  client_id: string
  created_at: string
  clients: { company_name: string } | null
}

export interface ClientOption {
  id: string
  company_name: string
}

export interface ProjectActiveUnit {
  id: string
  start_date: string
  units: {
    id: string
    code: string
    name: string
    category: string
  } | null
}
