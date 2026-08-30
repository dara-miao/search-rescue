import { create } from 'zustand'
import { fetchCampusGoogle, type IngressMeta, type PlaceLabel } from './google'
import { heightAt } from './ground'
import { hasGoogleKey } from './maps'
import { CAMPUS, SURVIVORS, dist2 } from './world'

export type Phase = 'briefing' | 'playing' | 'complete' | 'failed'

export type SurvivorState = {
  id: string
  name: string
  role: string
  x: number
  z: number
  y: number
  note: string
  found: boolean
}

export type RobotState = {
  x: number
  y: number
  z: number
  yaw: number
  pitch: number
  speed: number
  moving: boolean
}

type GameStore = {
  phase: Phase
  thermal: boolean
  tilesReady: boolean
  elapsed: number
  robot: RobotState
  survivors: SurvivorState[]
  nearestId: string | null
  nearestDist: number
  worldOrbit: number
  markFlash: number
  lastMarked: string | null
  places: PlaceLabel[]
  evacPath: Array<[number, number]>
  evacMeta: IngressMeta | null
  googleFeeds: 'idle' | 'loading' | 'live' | 'error'
  start: () => void
  reset: () => void
  hydrateGoogle: () => Promise<void>
  setTilesReady: (ready: boolean) => void
  toggleThermal: () => void
  setWorldOrbit: (v: number) => void
  applyRobot: (patch: Partial<RobotState>) => void
  tick: (dt: number) => void
  tryMark: () => boolean
}

function freshSurvivors(): SurvivorState[] {
  return SURVIVORS.map((s) => ({ ...s, found: false }))
}

/** On the west steps, facing into Times-Mirror. */
export const DEPLOY = { x: 108.6, z: 50.2, yaw: 1.28 }

function freshRobot(): RobotState {
  return {
    x: DEPLOY.x,
    y: heightAt(DEPLOY.x, DEPLOY.z) + 0.52,
    z: DEPLOY.z,
    yaw: DEPLOY.yaw,
    pitch: -0.08,
    speed: 0,
    moving: false,
  }
}

export const useGame = create<GameStore>((set, get) => ({
  phase: 'briefing',
  thermal: false,
  tilesReady: false,
  elapsed: 0,
  robot: freshRobot(),
  survivors: freshSurvivors(),
  nearestId: null,
  nearestDist: 999,
  worldOrbit: 0.35,
  markFlash: 0,
  lastMarked: null,
  places: [],
  evacPath: [],
  evacMeta: null,
  googleFeeds: 'idle',

  hydrateGoogle: async () => {
    if (!hasGoogleKey()) {
      set({ googleFeeds: 'error' })
      return
    }
    if (get().googleFeeds === 'loading' || get().googleFeeds === 'live') return
    set({ googleFeeds: 'loading' })
    try {
      const data = await fetchCampusGoogle()
      set({
        places: data.places,
        evacPath: data.path,
        evacMeta: data.meta,
        googleFeeds: data.places.length || data.path.length ? 'live' : 'error',
      })
    } catch {
      set({ googleFeeds: 'error' })
    }
  },

  start: () =>
    set({
      phase: 'playing',
      thermal: false,
      elapsed: 0,
      robot: freshRobot(),
      survivors: freshSurvivors(),
      nearestId: null,
      nearestDist: 999,
      markFlash: 0,
      lastMarked: null,
    }),

  reset: () =>
    set({
      phase: 'briefing',
      thermal: false,
      elapsed: 0,
      robot: freshRobot(),
      survivors: freshSurvivors(),
      nearestId: null,
      nearestDist: 999,
      markFlash: 0,
      lastMarked: null,
    }),

  toggleThermal: () => set((s) => ({ thermal: !s.thermal })),

  setTilesReady: (ready) => set({ tilesReady: ready }),

  setWorldOrbit: (v) => set({ worldOrbit: v }),

  applyRobot: (patch) =>
    set((s) => ({
      robot: { ...s.robot, ...patch },
    })),

  tick: (dt) => {
    const s = get()
    if (s.phase !== 'playing') return

    const elapsed = s.elapsed + dt
    const { x, z } = s.robot
    let nearestId: string | null = null
    let nearestDist = 999
    for (const person of s.survivors) {
      if (person.found) continue
      const d = dist2(x, z, person.x, person.z)
      if (d < nearestDist) {
        nearestDist = d
        nearestId = person.id
      }
    }

    const foundCount = s.survivors.filter((p) => p.found).length
    let phase: Phase = s.phase
    if (foundCount >= s.survivors.length) phase = 'complete'
    else if (elapsed >= CAMPUS.timeLimit) phase = 'failed'

    set({
      elapsed,
      nearestId,
      nearestDist,
      phase,
      markFlash: Math.max(0, s.markFlash - dt),
    })
  },

  tryMark: () => {
    const s = get()
    if (s.phase !== 'playing' || !s.nearestId) return false
    if (s.nearestDist > CAMPUS.markRange) return false
    const survivors = s.survivors.map((p) =>
      p.id === s.nearestId ? { ...p, found: true } : p,
    )
    const allFound = survivors.every((p) => p.found)
    set({
      survivors,
      lastMarked: s.nearestId,
      markFlash: 2.2,
      phase: allFound ? 'complete' : s.phase,
    })
    return true
  },
}))
