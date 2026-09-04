import { stagingPose } from '../drive/spawn'
import { spawnWalkout } from './evacuees'
import { allVented, fireIntensityOf, stepFire } from './fire'
import { actDist, RESCUE_RANGE, SCAN_RANGE } from './intent'
import { dist, nearVentedFacade } from './layout'
import type { Extraction, HoldState, RunInput, RunState, Victim } from './types'

export const ASSESS_S = 2
const MARK_S = 2
const MOVE_BREAK = 0.25
const STAGING_R = 7
const DRAIN_MOVE = 0.55
const DRAIN_SCAN = 1.4
const RECHARGE = 12
const HEAT_DRAIN = 2.5

function cellOf(state: RunState, id: string) {
  return state.cells.find((c) => c.id === id) ?? null
}

function extractionOf(state: RunState, victim: Victim): Extraction | null {
  if (victim.type === 'UNREACHABLE') return null
  return (
    state.extractions.find((e) => e.cellId === victim.cellId) ??
    state.extractions.find((e) => e.floor === Math.min(victim.floor, 1) && e.row === victim.row && e.col === victim.col) ??
    null
  )
}

function extractionOpen(state: RunState, ext: Extraction | null) {
  if (!ext) return false
  const cell = cellOf(state, ext.cellId)
  return Boolean(cell && !cell.vented)
}

function noteSeen(state: RunState, victim: Victim) {
  if (victim.seenAt != null) return
  victim.seenAt = state.t
  if (victim.action === 'never') victim.action = 'none'
  state.encounters.push({ id: victim.id, at: state.t })
}

function lose(victim: Victim, reason: 'clock' | 'vent', state: RunState) {
  if (victim.state === 'RESCUED') return
  if (victim.state === 'LOST') return
  victim.state = 'LOST'
  victim.lostReason = reason
  if (state.carriedId === victim.id) state.carriedId = null
}

function applyVents(state: RunState) {
  for (const victim of state.victims) {
    if (victim.state === 'RESCUED' || victim.state === 'LOST') continue
    const cell = cellOf(state, victim.cellId)
    if (cell?.vented) lose(victim, 'vent', state)
  }
}

function tickClocks(state: RunState, dt: number) {
  for (const victim of state.victims) {
    if (victim.state !== 'WAITING' && victim.state !== 'CARRIED' && victim.state !== 'MARKED') continue
    if (victim.state === 'MARKED') {
      const cell = cellOf(state, victim.cellId)
      if (cell?.vented) lose(victim, 'vent', state)
      continue
    }
    victim.clock -= dt
    if (victim.clock <= 0) lose(victim, 'clock', state)
    else {
      const cell = cellOf(state, victim.cellId)
      if (cell?.vented) lose(victim, 'vent', state)
    }
  }
}

function pickTarget(
  state: RunState,
  input: RunInput,
): { kind: HoldState['kind']; victim: Victim | null; need: number } {
  if (state.carriedId && dist(input.x, input.z, stagingPose().x, stagingPose().z) < STAGING_R) {
    return { kind: 'idle', victim: null, need: 0 }
  }

  let bestRescue: Victim | null = null
  let bestRescueD = Infinity
  let bestMark: Victim | null = null
  let bestMarkD = Infinity
  let bestScan: Victim | null = null
  let bestScanD = Infinity

  for (const victim of state.victims) {
    if (victim.state !== 'WAITING') continue
    const dAct = actDist(state, victim, input.x, input.z)
    if (victim.type === 'UNREACHABLE' && dAct <= SCAN_RANGE && dAct < bestMarkD) {
      bestMark = victim
      bestMarkD = dAct
    }
    const ext = extractionOf(state, victim)
    if (ext && extractionOpen(state, ext) && victim.type !== 'UNREACHABLE') {
      const d = dist(input.x, input.z, ext.x, ext.z)
      if (d <= RESCUE_RANGE && d < bestRescueD) {
        if (victim.type === 'ASSISTED' && state.carriedId) continue
        bestRescue = victim
        bestRescueD = d
      }
    }
    if (dAct <= SCAN_RANGE && !victim.scanned && dAct < bestScanD) {
      bestScan = victim
      bestScanD = dAct
    }
  }

  if (input.forceRescue && bestRescue) {
    return { kind: 'rescue', victim: bestRescue, need: bestRescue.rescueTime }
  }
  if (bestMark) return { kind: 'mark', victim: bestMark, need: MARK_S }
  if (bestScan) return { kind: 'scan', victim: bestScan, need: ASSESS_S }
  if (bestRescue) return { kind: 'rescue', victim: bestRescue, need: bestRescue.rescueTime }
  return { kind: 'idle', victim: null, need: 0 }
}

function writeReveal(state: RunState, victim: Victim, kind: 'scan' | 'rescue' | 'mark') {
  const ext = extractionOf(state, victim)
  state.lastReveal = {
    victimId: victim.id,
    kind,
    at: state.t,
    roomName: victim.roomName,
    opening: ext?.opening ?? victim.roomName,
    signature: victim.signature,
    condition: victim.condition,
    type: victim.type,
    count: victim.count,
  }
}

function finishHold(state: RunState, victim: Victim, kind: HoldState['kind']) {
  noteSeen(state, victim)
  if (kind === 'scan') {
    if (victim.state === 'LOST') victim.scanLost = true
    victim.scanned = true
    if (victim.action === 'never' || victim.action === 'none') victim.action = 'scanned'
    writeReveal(state, victim, 'scan')
    return
  }
  if (kind === 'mark') {
    if (victim.state !== 'WAITING') return
    victim.state = 'MARKED'
    victim.action = 'marked'
    writeReveal(state, victim, 'mark')
    return
  }
  if (kind === 'rescue') {
    if (victim.state !== 'WAITING') return
    const ext = extractionOf(state, victim)
    if (!extractionOpen(state, ext)) return
    victim.state = 'RESCUED'
    victim.action = 'rescued'
    spawnWalkout(state, victim, ext)
    writeReveal(state, victim, 'rescue')
  }
}

function tickHold(state: RunState, input: RunInput, dt: number) {
  if (state.carriedId && dist(input.x, input.z, stagingPose().x, stagingPose().z) < STAGING_R) {
    const carried = state.victims.find((v) => v.id === state.carriedId)
    if (carried && carried.state === 'CARRIED') {
      carried.state = 'RESCUED'
      carried.action = 'rescued'
      state.carriedId = null
    }
    state.hold = { kind: 'idle', targetId: null, progress: 0, need: 0 }
    return
  }

  const moving = input.moving || Math.abs(input.speed) > MOVE_BREAK
  if (moving) {
    state.hold = { kind: 'idle', targetId: null, progress: 0, need: 0 }
    return
  }

  if (state.hold.kind !== 'idle' && state.hold.targetId) {
    const victim = state.victims.find((v) => v.id === state.hold.targetId)
    if (!victim) {
      state.hold = { kind: 'idle', targetId: null, progress: 0, need: 0 }
      return
    }
    const progress = state.hold.progress + dt
    if (progress >= state.hold.need) {
      finishHold(state, victim, state.hold.kind)
      state.hold = { kind: 'idle', targetId: null, progress: 0, need: 0 }
      return
    }
    state.hold = { ...state.hold, progress }
    return
  }

  if (!input.hold) {
    state.hold = { kind: 'idle', targetId: null, progress: 0, need: 0 }
    return
  }

  const target = pickTarget(state, input)
  if (target.kind === 'idle' || !target.victim) {
    state.hold = { kind: 'idle', targetId: null, progress: 0, need: 0 }
    return
  }

  const progress = dt
  if (progress >= target.need) {
    finishHold(state, target.victim, target.kind)
    state.hold = { kind: 'idle', targetId: null, progress: 0, need: 0 }
    return
  }
  state.hold = { kind: target.kind, targetId: target.victim.id, progress, need: target.need }
}

function tickBattery(state: RunState, input: RunInput, dt: number) {
  const staging = dist(input.x, input.z, stagingPose().x, stagingPose().z) < STAGING_R
  if (staging) {
    state.battery = Math.min(100, state.battery + RECHARGE * dt)
    return
  }
  let drain = 0
  if (input.moving || Math.abs(input.speed) > 0.14) drain += DRAIN_MOVE
  if (state.hold.kind === 'scan') drain += DRAIN_SCAN
  if (nearVentedFacade(input.x, input.z, state.cells)) drain *= HEAT_DRAIN
  state.battery = Math.max(0, state.battery - drain * dt)
}

function tickThermal(state: RunState, input: RunInput) {
  state.thermal = input.thermal
  if (!input.thermal) return
  for (const victim of state.victims) {
    if (victim.state === 'RESCUED' || victim.state === 'LOST') continue
    if (dist(input.x, input.z, victim.x, victim.z) < 48) noteSeen(state, victim)
  }
}

function maybeEnd(state: RunState) {
  if (allVented(state.cells)) {
    state.phase = 'debrief'
    for (const victim of state.victims) {
      if (victim.state === 'WAITING' || victim.state === 'CARRIED') {
        const cell = cellOf(state, victim.cellId)
        lose(victim, cell?.vented ? 'vent' : 'clock', state)
      }
      if (victim.seenAt != null && victim.action === 'none' && victim.state !== 'RESCUED') {
        victim.action = 'skipped'
      }
    }
  }
}

export function stepRun(state: RunState, input: RunInput, dt: number): RunState {
  if (state.phase !== 'playing') return state
  const h = Math.max(0, Math.min(0.05, dt))
  state.t += h
  const fire = stepFire(state.cells, h, state.t, state.fireAcc)
  state.fireAcc = fire.acc
  for (const ev of fire.events) {
    if (ev.kind === 'vent') state.vents.push(ev)
  }
  state.fireIntensity = fireIntensityOf(state.cells)
  applyVents(state)
  tickClocks(state, h)
  tickThermal(state, input)
  tickHold(state, input, h)
  tickBattery(state, input, h)
  state.inHeat = nearVentedFacade(input.x, input.z, state.cells)
  maybeEnd(state)
  return state
}

export function counts(state: RunState) {
  let saved = 0
  let lost = 0
  let marked = 0
  let waiting = 0
  let peopleSaved = 0
  let peopleLost = 0
  for (const v of state.victims) {
    if (v.state === 'RESCUED') {
      saved++
      peopleSaved += v.count
    } else if (v.state === 'LOST') {
      lost++
      peopleLost += v.count
    } else if (v.state === 'MARKED') marked++
    else waiting++
  }
  return { saved, lost, marked, waiting, peopleSaved, peopleLost }
}
