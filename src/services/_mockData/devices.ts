import type { Device } from '@/types/device'
import { SENSORS } from './sensors'

/** Inicializamos los dispositivos a partir de los sensores conocidos */
export const DEVICES: Device[] = SENSORS.map((s) => ({
  id: `d-${s.id}`,
  technicalId: s.technicalId,
  latitude: s.latitude,
  longitude: s.longitude,
  status: s.status === 'offline' && s.battery === 0 ? 'decommissioned' : 'active',
  createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
  updatedAt: new Date().toISOString(),
}))
