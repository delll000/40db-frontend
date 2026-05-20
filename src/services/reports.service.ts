import { mock } from './_utils'
import { REPORTS } from './_mockData/reports'
import type { NewReportInput, Report } from '@/types/report'

let store: Report[] = [...REPORTS]

export const reportsService = {
  list: () => mock<Report[]>(store),

  byCitizen: async (email: string): Promise<Report[]> => {
    return mock(store.filter((r) => r.citizenEmail === email))
  },

  create: async (input: NewReportInput): Promise<Report> => {
    if (!input.description.trim()) throw new Error('La descripción es obligatoria')
    if (!input.address.trim()) throw new Error('La dirección es obligatoria')
    const report: Report = {
      id: `r-${Date.now()}`,
      ...input,
      createdAt: new Date().toISOString(),
    }
    store = [report, ...store]
    return mock(report, 400)
  },
}
