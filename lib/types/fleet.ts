export interface UnitStatus {
  id: string
  code: string
  name: string
  category: 'vehicle' | 'heavy_equipment'
  subcategory: string | null
  year: number | null
  plate_or_serial: string | null
  is_maintenance: boolean
  status: 'idle' | 'active' | 'maintenance'
  active_project_id: string | null
  active_project_name: string | null
  deployment_start_date: string | null
}

export interface DeploymentHistory {
  id: string
  start_date: string
  end_date: string | null
  notes: string | null
  projects: {
    name: string
    location: string | null
  } | null
}
