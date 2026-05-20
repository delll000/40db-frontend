import type { Report } from '@/types/report'

function isoHoursAgo(h: number): string {
  return new Date(Date.now() - h * 60 * 60 * 1000).toISOString()
}

export const REPORTS: Report[] = [
  {
    id: 'r-001',
    citizenName: 'Camila Vecina',
    citizenEmail: 'camila.vecina@correo.cl',
    category: 'fiesta',
    description: 'Fiesta en la propiedad continua, música muy alta hasta tarde.',
    zone: 'Maipú Centro',
    address: 'Av. Pajaritos 1234',
    createdAt: isoHoursAgo(28),
  },
  {
    id: 'r-002',
    citizenName: 'Camila Vecina',
    citizenEmail: 'camila.vecina@correo.cl',
    category: 'comercio',
    description: 'Local de comida con extractor industrial muy ruidoso.',
    zone: 'Plaza Maipú',
    address: 'Plaza de Maipú s/n',
    createdAt: isoHoursAgo(72),
  },
]
