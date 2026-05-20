export interface HeatmapFilters {
  /** ISO date YYYY-MM-DD */
  dateFrom: string
  /** ISO date YYYY-MM-DD */
  dateTo: string
  /** HH (00-23) */
  hourFrom: number
  /** HH (00-23) */
  hourTo: number
  zone: string | ''
  sensorId: string | ''
}

export function defaultHeatmapFilters(): HeatmapFilters {
  const today = new Date()
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)
  const fmt = (d: Date) => d.toISOString().slice(0, 10)
  return {
    dateFrom: fmt(yesterday),
    dateTo: fmt(today),
    hourFrom: 0,
    hourTo: 23,
    zone: '',
    sensorId: '',
  }
}
