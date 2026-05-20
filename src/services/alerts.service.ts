import { mock } from './_utils'
import { ALERTS, ALERT_HISTORY } from './_mockData/alerts'
import type { Alert, AlertHistoryEntry, AlertStatus } from '@/types/alert'

const alertsStore: Alert[] = [...ALERTS]
let historyStore: AlertHistoryEntry[] = [...ALERT_HISTORY]

export const alertsService = {
  list: (filter?: { status?: AlertStatus }) => {
    const filtered = filter?.status
      ? alertsStore.filter((a) => a.status === filter.status)
      : alertsStore
    return mock<Alert[]>(filtered)
  },

  byId: async (id: string): Promise<Alert | null> => {
    const a = alertsStore.find((x) => x.id === id) ?? null
    return mock<Alert | null>(a, 150)
  },

  historyFor: async (alertId: string): Promise<AlertHistoryEntry[]> => {
    const items = historyStore
      .filter((h) => h.alertId === alertId)
      .sort((a, b) => b.changedAt.localeCompare(a.changedAt))
    return mock(items, 150)
  },

  changeStatus: async (
    id: string,
    newStatus: AlertStatus,
    comment: string,
    funcionario: { id: string; name: string },
  ): Promise<Alert> => {
    if (!comment.trim()) {
      throw new Error('El comentario es obligatorio')
    }
    const idx = alertsStore.findIndex((a) => a.id === id)
    if (idx === -1) throw new Error('Alerta no encontrada')
    const current = alertsStore[idx]!
    const previousStatus = current.status

    // Validación de transición permitida (HU-002)
    const valid: Record<AlertStatus, AlertStatus[]> = {
      activa: ['atendida'],
      atendida: ['cerrada'],
      cerrada: [],
    }
    if (!valid[previousStatus].includes(newStatus)) {
      throw new Error(`Transición no permitida: ${previousStatus} → ${newStatus}`)
    }

    const updated: Alert = { ...current, status: newStatus }
    alertsStore[idx] = updated

    historyStore = [
      {
        id: `h-${Date.now()}`,
        alertId: id,
        funcionarioId: funcionario.id,
        funcionarioName: funcionario.name,
        previousStatus,
        newStatus,
        comment,
        changedAt: new Date().toISOString(),
        isReversion: false,
      },
      ...historyStore,
    ]

    return mock(updated, 250)
  },
}
