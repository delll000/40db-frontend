export interface Report {
  id: string
  citizenName: string
  citizenEmail: string
  category: string
  description: string
  zone: string
  address: string
  createdAt: string
}

export interface NewReportInput {
  citizenName: string
  citizenEmail: string
  category: string
  description: string
  zone: string
  address: string
}

export const REPORT_CATEGORIES = [
  { value: 'fiesta', label: 'Fiestas / eventos' },
  { value: 'vecinos', label: 'Vecinos' },
  { value: 'comercio', label: 'Comercio / industria' },
  { value: 'construccion', label: 'Obra / construcción' },
  { value: 'transito', label: 'Tránsito / vehículos' },
  { value: 'otro', label: 'Otro' },
] as const
