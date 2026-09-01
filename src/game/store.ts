import { create } from 'zustand'
import { fetchCampusGoogle, type IngressMeta, type PlaceLabel } from './google'
import { heightAt } from './ground'
import { hasGoogleKey } from './maps'
import type { PadMode } from './steer'
import { dist2 } from './world'
import { createSim, markNearest, stepSim } from '../sim/step'
import type { FailCode, SimState, VictimSim } from '../sim/types'

export type Phase = 'briefing' | 'playing' | 'complete' | 'failed'

export type SurvivorState = VictimSim & { found: boolean; y: number }

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
  sim: SimState
  survivors: SurvivorState[]
  nearestId: string | null
  nearestDist: number
  failNote: string
  failCode: FailCode | null
  worldOrbit: number
  markFlash: number
  lastMarked: string | null
  places: PlaceLabel[]
  evacPath: Array<[number, number]>
  evacMeta: IngressMeta | null
  googleFeeds: 'idle' | 'loading' | 'live' | 'error'
  padMode: PadMode
  briefingStep: number
  narration: string
  autoTarget: { x: number; z: number } | null
  trail: Array<[number, number]>
  setBriefingStep: (step: number) => void
  setWatch: (patch: { narration?: string; autoTarget?: { x: number; z: number } | null; trail?: Array<[number, number]> }) => void
  start: () => void
  reset: () => void
  hydrateGoogle: () => Promise<void>
  setTilesReady: (ready: boolean) => void
  toggleThermal: () => void
  setPadMode: (mode: PadMode) => void
  setWorldOrbit: (v: number) => void
  applyRobot: (patch: Partial<RobotState>) => void
  tick: (dt: number) => void
  tryMark: () => boolean
}

function viewSurvivors(sim: SimState): SurvivorState[] {
  return sim.victims.map((v) => ({
    ...v,
    found: v.status === 'marked',
    y: 0,
  }))
}

function nearestSeen(sim: SimState, x: number, z: number) {
  let nearestId: string | null = null
  let nearestDist = 999
  for (const person of sim.victims) {
    if (person.status === 'marked' || person.status === 'lost') continue
    const d = dist2(x, z, person.x, person.z)
    if (d < nearestDist) {
      nearestDist = d
      nearestId = person.id
    }
  }
  return { nearestId, nearestDist }
}

function phaseOf(sim: SimState): Phase {
  if (sim.complete) return 'complete'
  if (sim.fail) return 'failed'
  return 'playing'
}

function syncFromSim(sim: SimState, robot: RobotState, markFlash: number) {
  const near = nearestSeen(sim, robot.x, robot.z)
  return {
    sim,
    elapsed: sim.elapsed,
    survivors: viewSurvivors(sim),
    nearestId: near.nearestId,
    nearestDist: near.nearestDist,
    failNote: sim.failNote,
    failCode: sim.fail,
    phase: phaseOf(sim),
    markFlash: Math.max(0, markFlash),
  }
}

/** On the walk west of Doheny, facing the fire — not inside the door. */
export const DEPLOY = { x: 94, z: 52, yaw: 1.37 }

function freshRobot(): RobotState {
  return {
    x: DEPLOY.x,
    y: heightAt(DEPLOY.x, DEPLOY.z) + 0.52,
    z: DEPLOY.z,
    yaw: DEPLOY.yaw,
    pitch: 0.16,
    speed: 0,
    moving: false,
  }
}

const boot = createSim()

export const useGame = create<GameStore>((set, get) => ({
  phase: 'briefing',
  thermal: false,
  tilesReady: false,
  elapsed: 0,
  robot: freshRobot(),
  sim: boot,
  survivors: viewSurvivors(boot),
  nearestId: null,
  nearestDist: 999,
  failNote: '',
  failCode: null,
  worldOrbit: 0.35,
  markFlash: 0,
  lastMarked: null,
  places: [],
  evacPath: [],
  evacMeta: null,
  googleFeeds: 'idle',
  padMode: 'drive',
  briefingStep: 0,
  narration: '',
  autoTarget: null,
  trail: [],

  setBriefingStep: (step) => set({ briefingStep: Math.max(0, step) }),

  setWatch: (patch) =>
    set(
      Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined)) as typeof patch,
    ),

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

  start: () => {
    const sim = createSim()
    const robot = freshRobot()
    set({
      thermal: false,
      padMode: 'drive',
      robot,
      lastMarked: null,
      briefingStep: 0,
      narration: 'Leaving the plaza. Heading for the west door.',
      autoTarget: { x: 104, z: 50 },
      trail: [[robot.x, robot.z]],
      ...syncFromSim(sim, robot, 0),
      phase: 'playing',
    })
    void get().hydrateGoogle()
  },

  reset: () => {
    const sim = createSim()
    const robot = freshRobot()
    set({
      thermal: false,
      padMode: 'drive',
      robot,
      lastMarked: null,
      briefingStep: 0,
      narration: '',
      autoTarget: null,
      trail: [],
      ...syncFromSim(sim, robot, 0),
      phase: 'briefing',
    })
  },

  toggleThermal: () => set((s) => ({ thermal: !s.thermal })),

  setPadMode: (mode) => set({ padMode: mode }),

  setTilesReady: (ready) => set({ tilesReady: ready }),

  setWorldOrbit: (v) => set({ worldOrbit: v }),

  applyRobot: (patch) =>
    set((s) => ({
      robot: { ...s.robot, ...patch },
    })),

  tick: (dt) => {
    const s = get()
    if (s.phase !== 'playing') return
    stepSim(s.sim, s.robot, s.thermal, dt)
    set(syncFromSim(s.sim, s.robot, s.markFlash - dt))
  },

  tryMark: () => {
    const s = get()
    if (s.phase !== 'playing') return false
    const id = markNearest(s.sim, s.robot)
    if (!id) return false
    set({
      ...syncFromSim(s.sim, s.robot, 2.2),
      lastMarked: id,
    })
    return true
  },
}))
