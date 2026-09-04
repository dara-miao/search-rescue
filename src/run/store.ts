import { create } from 'zustand'
import { resetRunAudio } from './audio'
import { coachFromRun, type CoachStep } from './coach'
import { createRun } from './generate'
import { stepRun } from './tick'
import type { RunInput, RunState } from './types'

type RunStore = RunState & {
  coach: CoachStep
  hudThermal: boolean
  hudHold: boolean
  hudRescue: boolean
  start: (seed?: number) => void
  begin: () => void
  skipCoach: () => void
  showCredits: () => void
  hideCredits: () => void
  toggleThermal: () => void
  replay: () => void
  tick: (input: RunInput, dt: number) => void
  setHud: (patch: { thermal?: boolean; hold?: boolean; rescue?: boolean }) => void
}

function gated(seed?: number): RunState {
  return { ...createRun(seed ?? ((Math.random() * 1e9) | 0)), phase: 'briefing', t: 0 }
}

let hudWait = 0

export const useRun = create<RunStore>((set, get) => ({
  ...gated(),
  coach: 'off',
  hudThermal: false,
  hudHold: false,
  hudRescue: false,
  start: (seed) => {
    hudWait = 0
    resetRunAudio()
    set({
      ...gated(seed),
      coach: 'off',
      hudThermal: false,
      hudHold: false,
      hudRescue: false,
    })
  },
  begin: () => {
    if (get().phase !== 'briefing') return
    set({ phase: 'playing', t: 0, coach: 'drive' })
  },
  skipCoach: () => set({ coach: 'off' }),
  showCredits: () => {
    if (get().phase !== 'debrief') return
    set({ phase: 'credits' })
  },
  hideCredits: () => {
    if (get().phase !== 'credits') return
    set({ phase: 'debrief' })
  },
  toggleThermal: () => set({ hudThermal: !get().hudThermal }),
  replay: () => {
    const seed = get().seed
    hudWait = 0
    resetRunAudio()
    set({
      ...gated(seed),
      phase: 'playing',
      t: 0,
      coach: 'off',
      hudThermal: false,
      hudHold: false,
      hudRescue: false,
    })
  },
  setHud: (patch) =>
    set({
      hudThermal: patch.thermal ?? get().hudThermal,
      hudHold: patch.hold ?? get().hudHold,
      hudRescue: patch.rescue ?? get().hudRescue,
    }),
  tick: (input, dt) => {
    const prev = get()
    if (prev.phase !== 'playing') return
    const ventsBefore = prev.vents.length
    const holdKind = prev.hold.kind
    const carried = prev.carriedId
    const wasHeat = prev.inHeat
    const revealAt = prev.lastReveal?.at
    const evacBefore = prev.evacuees.length
    stepRun(prev, input, dt)
    const beforeCoach = get().coach
    const coach = coachFromRun(beforeCoach, prev, input.x, input.z, input.speed)
    hudWait += dt
    const flush =
      hudWait >= 0.12 ||
      prev.phase !== 'playing' ||
      prev.thermal !== input.thermal ||
      prev.hold.kind !== holdKind ||
      prev.carriedId !== carried ||
      prev.vents.length !== ventsBefore ||
      prev.inHeat !== wasHeat ||
      prev.lastReveal?.at !== revealAt ||
      prev.evacuees.length !== evacBefore ||
      coach !== beforeCoach ||
      (prev.evacuees.length > 0 && hudWait >= 0.03)
    if (!flush) return
    hudWait = 0
    set({
      phase: prev.phase,
      t: prev.t,
      battery: prev.battery,
      thermal: prev.thermal,
      hold: { ...prev.hold },
      carriedId: prev.carriedId,
      fireIntensity: prev.fireIntensity,
      inHeat: prev.inHeat,
      vents: prev.vents,
      victims: prev.victims,
      cells: prev.cells,
      encounters: prev.encounters,
      lastReveal: prev.lastReveal,
      evacuees: prev.evacuees,
      coach,
    })
  },
}))
