import { mock } from './_utils'
import { DEVICES } from './_mockData/devices'
import type { Device } from '@/types/device'

let store = [...DEVICES]

export const devicesService = {
  list: () => mock<Device[]>(store),

  async create(input: { technicalId: string; latitude: number; longitude: number }): Promise<Device> {
    if (store.some((d) => d.technicalId === input.technicalId)) {
      throw new Error('Ya existe un dispositivo con este ID técnico')
    }
    const now = new Date().toISOString()
    const device: Device = {
      id: `d-${Date.now()}`,
      technicalId: input.technicalId,
      latitude: input.latitude,
      longitude: input.longitude,
      status: 'active',
      createdAt: now,
      updatedAt: now,
    }
    store = [device, ...store]
    return mock(device, 200)
  },

  async update(id: string, patch: Partial<Pick<Device, 'technicalId' | 'latitude' | 'longitude'>>): Promise<Device> {
    const idx = store.findIndex((d) => d.id === id)
    if (idx === -1) throw new Error('Dispositivo no encontrado')
    if (
      patch.technicalId &&
      store.some((d) => d.id !== id && d.technicalId === patch.technicalId)
    ) {
      throw new Error('Ya existe un dispositivo con este ID técnico')
    }
    const updated: Device = {
      ...store[idx]!,
      ...patch,
      updatedAt: new Date().toISOString(),
    }
    store[idx] = updated
    return mock(updated, 200)
  },

  async decommission(id: string): Promise<Device> {
    const idx = store.findIndex((d) => d.id === id)
    if (idx === -1) throw new Error('Dispositivo no encontrado')
    const updated: Device = {
      ...store[idx]!,
      status: 'decommissioned',
      updatedAt: new Date().toISOString(),
    }
    store[idx] = updated
    return mock(updated, 200)
  },
}
