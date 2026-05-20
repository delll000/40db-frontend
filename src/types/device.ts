export type DeviceStatus = 'active' | 'decommissioned'

export interface Device {
  id: string
  technicalId: string
  latitude: number
  longitude: number
  status: DeviceStatus
  createdAt: string
  updatedAt: string
}
