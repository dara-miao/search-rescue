import { create } from 'zustand'
import { freshBody, stepDrive, type DriveBody, type DriveStick } from './step'

type DriveStore = DriveBody & {
  zoom: number
  stickX: number
  stickY: number
  stickOn: boolean
  setStick: (x: number, y: number, on: boolean) => void
  setZoom: (z: number) => void
  step: (stick: DriveStick, dt: number, speedScale?: number) => void
  reset: () => void
}

export const useDrive = create<DriveStore>((set, get) => ({
  ...freshBody(),
  zoom: 14,
  stickX: 0,
  stickY: 0,
  stickOn: false,
  setStick: (x, y, on) => set({ stickX: x, stickY: y, stickOn: on }),
  setZoom: (z) => set({ zoom: Math.max(8, Math.min(25, z)) }),
  step: (stick, dt, speedScale = 1) => {
    const s = get()
    const next = stepDrive(
      {
        x: s.x,
        z: s.z,
        y: s.y,
        yaw: s.yaw,
        speed: s.speed,
        yawRate: s.yawRate,
        moving: s.moving,
      },
      stick,
      dt,
      speedScale,
    )
    set(next)
  },
  reset: () => {
    set({
      ...freshBody(),
      zoom: 14,
      stickX: 0,
      stickY: 0,
      stickOn: false,
    })
  },
}))
